import { MessageService } from '@theia/core';
import {
    CommandContribution, CommandRegistry,
    MenuContribution, MenuModelRegistry, MenuPath,
    Disposable, DisposableCollection
} from '@theia/core/lib/common';
import { EncodingService } from '@theia/core/lib/common/encoding-service';
import { nls } from '@theia/core/lib/common/nls';
import { MaybePromise } from '@theia/core/lib/common/types';
import {
    FrontendApplicationContribution, FrontendApplication, ApplicationShell,
    CompositeTreeNode, SelectableTreeNode, CommonCommands, ConfirmDialog,
    KeybindingRegistry, CorePreferences
} from '@theia/core/lib/browser';

import { SaveResourceService } from '@theia/core/lib/browser/save-resource-service';
import { FormatType } from '@theia/core/lib/browser/saveable';

import { SingleTextInputDialog } from '@theia/core/lib/browser/dialogs';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { MonacoThemingService } from '@theia/monaco/lib/browser/monaco-theming-service';
import { Widget } from '@theia/core/lib/browser/widgets';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { inject, injectable } from '@theia/core/shared/inversify';
import { DebugCommands } from '@theia/debug/lib/browser/debug-frontend-application-contribution';
import { DebugConfigurationManager } from '@theia/debug/lib/browser/debug-configuration-manager';
import { BreakpointManager } from '@theia/debug/lib/browser/breakpoint/breakpoint-manager';
import { EditorManager, Range, Position } from '@theia/editor/lib/browser';
import { EditorCommands } from '@theia/editor/lib/browser/editor-command';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { WorkspaceVariableContribution } from '@theia/workspace/lib/browser/workspace-variable-contribution';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { ServiceConfig } from '../common/java-service-config';
import { InvokeBackendService } from '../common/protocol';
import { OutlineViewService } from '@theia/outline-view/lib/browser/outline-view-service';
import { JavaServiceOutlineSymbolInformationNode } from './outline/java-service-outline-contribution';
import { JavaServiceOutlineViewContribution } from './outline/java-service-outline-view-contribution';
import { JavaServiceOutlineContribution } from './outline/java-service-outline-contribution';
import { SharedComponentsDialog } from './java-service-shared-components-dialog';
import { JavaServiceCommands } from './java-service-commands';
import { JavaServiceInitialLayout } from './java-service-initial-layout';
import { handleError, handleOther, validateName, generateName } from './utils/java-service-utils';
import { MonacoThemeRegistry } from '@theia/monaco/lib/browser/textmate/monaco-theme-registry';
import { JavaServiceInvokeViewContribution } from './invoke-results/java-service-invoke-view-contribution';
import { JavaServiceApplicationShell } from './java-service-shell';
import { ReferencedLibsService } from './referenced-libs/referenced-libs-service';
import { JavaServiceInfo } from '../common/java-service-info';

const path = require('path');

export const OUTLINE_WIDGET_FACTORY_ID = 'outline-view';

const REMOTE_DEBUG_ID = 'Integration Server remote debug';
const JAVA_EXT = '.java';
const SLASH = '/';
const COLON = ':';
const BUILD_ACTION = 'build';
const SAVE_ACTION = 'save';
const PRIMARY_SOURCE = 'primarysource';
const ACTION_NONE = -1;
const ACTION_RUN = 0;
const ACTION_IO = 1;
const ACTION_BUSDATA = 2;
const ACTION_EXHIST = 3;
const ACTION_SCHED = 4;
const ACTION_VERHIST = 5;
const ACTION_SAVEWITHMSG = 6;

@injectable()
export class JavaServiceCommandContribution implements CommandContribution, MenuContribution, FrontendApplicationContribution, Disposable {

    @inject(EncodingService)
    protected readonly encodingService: EncodingService;

    @inject(MessageService)
    protected readonly messageService!: MessageService;

    @inject(DebugConfigurationManager)
    protected readonly debugConfigurationManager: DebugConfigurationManager;

    @inject(WorkspaceService)
    protected readonly workspaceService: WorkspaceService;

    @inject(WorkspaceVariableContribution)
    protected readonly workspaceVariables: WorkspaceVariableContribution;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;

    @inject(FrontendApplicationStateService)
    protected readonly stateService: FrontendApplicationStateService;

    @inject(EditorManager)
    protected readonly editorManager: EditorManager;

    @inject(FileService) protected readonly fileService: FileService;

    @inject(InvokeBackendService)
    protected readonly invokeBackendService: InvokeBackendService;

    @inject(OutlineViewService)
    protected readonly outlineViewService: OutlineViewService;

    @inject(ApplicationShell)
    protected readonly shell: ApplicationShell;

    @inject(JavaServiceOutlineViewContribution)
    protected readonly jsOutlineViewContribution: JavaServiceOutlineViewContribution;

    @inject(JavaServiceOutlineContribution)
    protected readonly jserviceOutlineContribution: JavaServiceOutlineContribution;

    @inject(ThemeService)
    protected readonly themeService: ThemeService;

    @inject(MonacoThemingService)
    protected readonly monacoThemingService: MonacoThemingService;

    @inject(StorageService)
    protected storageService: StorageService;

    @inject(WindowService)
    protected readonly windowService: WindowService;

    @inject(BreakpointManager)
    protected readonly breakpointManager: BreakpointManager;

    @inject(MonacoThemeRegistry)
    protected readonly monacoThemeRegistry: MonacoThemeRegistry;

    @inject(JavaServiceInvokeViewContribution)
    protected readonly javaServiceInvokeViewContribution: JavaServiceInvokeViewContribution;

    @inject(CorePreferences)
    protected readonly corePreferences: CorePreferences;

    @inject(SaveResourceService)
    protected readonly saveResourceService: SaveResourceService;

    @inject(ReferencedLibsService)
    protected readonly referencedLibsService: ReferencedLibsService;

    protected readonly toDispose = new DisposableCollection();

    static selectedJSNode: JavaServiceOutlineSymbolInformationNode;
    static selectedJSNodeBeforeRefresh: JavaServiceOutlineSymbolInformationNode;
    static editorPositionBeforeRefresh: Range;
    static editorSelectionBeforeRefresh: Range;
    static isJavaServiceSelectedInOutlineView = false;
    static isRootSelectedInOutlineView = false;
    static nodeFound = false;
    static assetInWs = false;
    static currentSourceSelection: any;
    static copiedJavaService: string;
    static edgeServerUnreachableMsg: string;
    pathSep: string;

    javaClassText =
        "package edge.proj4.javaservices;\n" +
        "// -----( IS Java Code Template v1.2\n" +
        "\n" +
        "import com.wm.data.*;\n" +
        "import com.wm.util.Values;\n" +
        "import com.wm.app.b2b.server.Service;\n" +
        "import com.wm.app.b2b.server.ServiceException;\n" +
        "// --- <<IS-START-IMPORTS>> ---\n" +
        "// --- <<IS-END-IMPORTS>> ---\n" +

        "public final class Default\n" +
        "\n" +
        "{\n" +
        "	// ---( internal utility methods )---\n" +
        "\n" +
        "	final static Default _instance = new Default();\n" +
        "	static Default _newInstance() { return new Default(); }\n" +
        "	static Default _cast(Object o) { return (Default)o; }\n" +
        "\n" +
        "	// ---( server methods )---\n" +
        "\n" +
        "	public static final void JS1 (IData pipeline)\n" +
        "        throws ServiceException\n" +
        "	{\n" +
        "		// --- <<IS-START(JS1)>> ---\n" +
        "		// @sigtype java 3.5\n" +
        "		int i = 0;\n" +
        "		int i1 = 0;\n" +
        "		//This is a test\n" +
        "		// --- <<IS-END>> ---\n" +
        "	}\n" +
        "}\n";

    // constructor() {
    // }

    /**
     * Called when the application is started
     *
     */
    onStart(app: FrontendApplication): void {
        console.log('****JSE JavaServiceCommandContribution onStart  ');
        // this.monacoThemeRegistry.register(
        //     require('../../data/jse-theme/lightsag.json'), {}, 'lightsag', 'vs').name!;

        this.doLoad();
    }

    async doLoad() {
        this.pathSep = path.sep;
        const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        if (rootUri && rootUri.path && rootUri.path.root && rootUri.path.root.base && rootUri.path.root.base.endsWith(':')) {
            this.pathSep = '\\';
        }

        // this.monacoThemingService.register({
        //     id: 'lightsag',
        //     label: 'SAG Theme',
        //     uiTheme: 'vs',
        //     uri: '../../data/lightsag.json',
        // });

        // id: 'myDarkTheme',
        // label: 'My Dark Theme',
        // uiTheme: 'vs-dark',
        // uri: 'file:///absolute/path/to/my_theme.json'

        // this.monacoThemeRegistry.register(
        //     require('../../data/jse-theme/lightsag.json'), {}, 'lightsag', 'vs').name!;


        this.checkLocale();

        this.setInitialLayout();

        this.handleGetJavaServiceInfo().then(() => {
            if (ServiceConfig.javaSuiteName && ServiceConfig.javaSuiteName.length > 0) {
                this.handleRefresh(false).then(() => {
                    JavaServiceCommandContribution.assetInWs = false;
                    var timesAssetChecked = 0;
                    const assetFound = setInterval(() => {
                        this.isClassInWorkspace().then(isInWS => {
                            if (isInWS) {
                                JavaServiceCommandContribution.assetInWs = true;
                                this.editJavaClass(ServiceConfig.javaClassFullPath);
                                this.setupEditor();
                                clearInterval(assetFound);
                            }
                            timesAssetChecked += 1;
                            if (timesAssetChecked >= 240) {
                                clearInterval(assetFound);
                                if (!JavaServiceCommandContribution.assetInWs) {
                                    console.error('The Java class ' + ServiceConfig.javaClassFullPath + ' is not in the workspace.');
                                    this.invalidJavaSuite();
                                }
                            }
                        });
                    }, 250);
                });
            }
        });
    }

    checkLocale() {
        console.log('****JSE checkLocale  ' + ServiceConfig.javaClassFullPath + ' is not in the workspace.');

        const localeId = window.localStorage.getItem(nls.localeId);
        if (!localeId) {
            this.windowService.setSafeToShutDown();
            window.localStorage.setItem(nls.localeId, 'en');  // TODO: Change this when other languages are supported
            this.windowService.reload();
        }
    }

    invalidJavaSuite() {
        alert('Missing package/suite');
        // TODO: Put this back when implemented
        // this.commandRegistry.executeCommand(JavaServiceCommands.BACK_TO_ORIGIN.id);
    }

    async isClassInWorkspace(): Promise<boolean> {
        // console.log('*************** Checking if the class is in the workspace');
        // console.log('*************** Workspace service: ' + this.workspaceService);
        // console.log('*************** Workspace service tryGetRoots: ' + this.workspaceService.tryGetRoots());
        // console.log('*************** Workspace service tryGetRoots[0]: ' + this.workspaceService.tryGetRoots()[0]);
        // console.log('*************** this.fileService: ' + this.fileService);

        const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        const fullClass = ServiceConfig.javaClassFullPath;
        // const fullClassURI = rootUri.resolve(fullClass);
        // console.log('*************** rootUri: ' + rootUri);
        // console.log('*************** ServiceConfig.javaClassFullPath: ' + ServiceConfig.javaClassFullPath);
        // console.log('*************** rootUri.resolve(ServiceConfig.javaClassFullPath): ' + rootUri.resolve(ServiceConfig.javaClassFullPath));
        // const projFolderUri = rootUri.resolve(ServiceConfig.projectName);

        let classLoc = rootUri.path.fsPath() + this.pathSep + fullClass;
        if (this.pathSep === '\\') {
            classLoc = classLoc.replace(/\//g, '\\');
        }

        const response = await this.invokeBackendService.isClassInWorkspace(classLoc);
        if (response === true) {
            return true;
        }
        // if (await this.fileService.exists(fullClassURI)) {
        //     return true;
        // }

        return false;
    }

    async addClassToWorkspace(sourceContent: string) {
        const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        const javaServicesFolderPath = ServiceConfig.javaServicesFullPath;
        const javaServicesFolderUri = rootUri.resolve(javaServicesFolderPath);

        let svcFolderLoc = rootUri.path.fsPath() + this.pathSep + javaServicesFolderPath;
        if (this.pathSep === '\\') {
            svcFolderLoc = svcFolderLoc.replace(/\//g, '\\');
        }

        const response = await this.invokeBackendService.isClassInWorkspace(svcFolderLoc);
        if (response === true) {
            this.createWorkspaceJavaClass(sourceContent);
        }
        else {
            this.createWorkspacePackageFoldersAndClass(sourceContent);
        }



        // this.fileService.exists(javaServicesFolderUri).then(isInWS => {
        //     if (isInWS) {
        //         this.createWorkspaceJavaClass(sourceContent);
        //     }
        //     else {
        //         this.createWorkspacePackageFoldersAndClass(sourceContent);
        //     }
        // });
    }

    async createWorkspacePackageFoldersAndClass(sourceContent: string) {
        const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        const javaServicesFolderPath = ServiceConfig.javaServicesFullPath;
        const javaServicesFolderUri = rootUri.resolve(javaServicesFolderPath);
        this.fileService.createFolder(javaServicesFolderUri);

        const referencedJarsFolderPath = ServiceConfig.referencedJarsFullPath;
        const referencedJarsFolderUri = rootUri.resolve(referencedJarsFolderPath);
        this.fileService.createFolder(referencedJarsFolderUri);

        this.createWorkspaceJavaClass(sourceContent);
    }

    async createWorkspaceJavaClass(sourceContent: string) {
        const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        const fullClass = ServiceConfig.javaClassFullPath;
        const fullClassURI = rootUri.resolve(fullClass);

        this.fileService.createFile(fullClassURI);
        this.fileService.write(fullClassURI, sourceContent)
        const widget = this.editorManager.currentEditor;
        if (widget && widget.editor) {
            const monacoEditor = widget.editor as MonacoEditor;
            this.jserviceOutlineContribution.ignoreChanges = true;
            monacoEditor.document.sync();
        }
        setTimeout(() => {
            this.referencedLibsService.getJarFilesInPackage();
        }, 1000);
    }

    async setInitialLayout() {
        console.log('****JSE setInitialLayout ');

        // let storageData: any = await this.storageService.getData('layout');
        // if (!storageData || !storageData.javaServiceEditor === true) {
        this.storageService.setData('layout', JavaServiceInitialLayout.initialLayout);
        // }
    }

    async setupEditor() {
        this.toDispose.dispose();
        this.toDispose.push(this.outlineViewService.onDidSelect(async node => {
            this.outlineSelection(node);
            this.setSelectedJavaService([node.parent], true);
            if (node && node.parent as CompositeTreeNode) {
                (this.shell as JavaServiceApplicationShell).getActionBar().setSelectedJavaService([node.parent as CompositeTreeNode], true);
            }
        }));
        this.toDispose.push(this.outlineViewService.onDidChangeOutline(async node => {
            if (JavaServiceCommandContribution.selectedJSNodeBeforeRefresh) {
                this.selectNode(JavaServiceCommandContribution.selectedJSNodeBeforeRefresh.name);
            }
            else {
                this.setSelectedJavaService(node, false);
            }
        }));
        // Todo: Put this back when debugging is required
        // this.stateService.reachedState('ready').then(() => {
        //     setTimeout(() => {
        //         // The java debugger must be registered first.  Give it time before starting the debugger.
        //         this.commandRegistry.executeCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_START.id);
        //     }, 2000);
        // });

        //this.themeService.setCurrentTheme('webMethods-light-theme');
        // this.themeService.setCurrentTheme('light');
        // MonacoThemingService.register({
        //     id: 'lightsag',
        //     label: 'SAG Theme',
        //     uiTheme: 'vs',
        //     json:require('../../data/lightsag.json'),
        // });

        // this.monacoThemeService.register({
        //     id: 'lightsag',
        //     label: 'SAG Theme',
        //     uiTheme: 'vs',
        //     uri:require('file:///data/lightsag.json'),
        // });
        // this.themeService.setCurrentTheme('lightsag');

        // const fileUri = rootUri.resolve('.theia/launch.json');
    }

    // Hack to force only one selection in the outline view
    outlineSelection(node: any) {
        let rootNode;
        const id: string = node.id;
        let parentNode = node.parent;
        while (parentNode) {
            if (!parentNode.parent) {
                break;
            }
            parentNode = parentNode.parent;
            rootNode = parentNode;
        }
        if (rootNode && rootNode.id === 'outline-view-root') {
            if (rootNode.children) {
                this.recursiveOutlineSelection(rootNode, id);
            }
        }
    }

    // Hack to force only one selection in the outline view
    recursiveOutlineSelection(node: any, id: string) {
        for (const childNode of node.children) {
            if (childNode.id === id) {
                childNode.selected = true;
            }
            else {
                childNode.selected = false;
            }
            if (childNode.children) {
                this.recursiveOutlineSelection(childNode, id);
            }
        }
    }

    onDidInitializeLayout(app: FrontendApplication): MaybePromise<void> {
        console.log('****JSE onDidInitializeLayout ');

        // Remove unused widgets
        app.shell.widgets.forEach((widget: Widget) => {
            if (['search-in-workspace', 'search-view-container', 'explorer-view-container', 'plugins',
                'vsx-extensions-view-container', 'scm-history', 'scm-view-container', 'scm-view',
                'settings_widget', 'test'].includes(widget.id) || widget.id.startsWith('plugin-view-container')) {
                widget.dispose();
            }
        });
        app.shell.leftPanelHandler.removeBottomMenu('settings-menu');
    }

    async editJavaClass(javaClassToEdit: string) {
        setTimeout(() => {
            this.editorManager.closeAll({ save: false });
            setTimeout(() => {
                const rootUri = this.workspaceService.tryGetRoots()[0].resource;
                const classUri = rootUri.resolve(javaClassToEdit);
                this.editorManager.open(classUri, { mode: 'reveal' }).then(() => {
                    this.toDispose.push(this.editorManager.currentEditor.editor.onSelectionChanged(selection => {
                        JavaServiceCommandContribution.currentSourceSelection = selection;
                    }));
                    this.selectNode(ServiceConfig.javaServiceName);
                    if (ServiceConfig.isReadOnly) {
                        this.setReadOnlyMode();
                    }
                });
            }, 150);
        }, 10);
    }

    setReadOnlyMode() {
        setTimeout(() => {
            if (this.editorManager.currentEditor.editor instanceof MonacoEditor) {
                (this.editorManager.currentEditor.editor as MonacoEditor).getControl().updateOptions({ readOnly: ServiceConfig.isReadOnly });
            }
        });
    }

    async getJavaClassToEdit(): Promise<string> {

        const urlSearchParams = new URLSearchParams(window.location.search);
        const isPackage = urlSearchParams.get('package');
        const isJavaSuite = urlSearchParams.get('javaSuite');

        if (isPackage && isJavaSuite) {
            return isPackage + SLASH + isJavaSuite + JAVA_EXT;
        }
        else {
            return undefined;
        }
    }

    /**
     * Called when the application is stopped or unloaded.
     *
     */
    onStop(app: FrontendApplication): void {
        console.log('****JSE JavaServiceCommandContribution onStop  ');

        this.commandRegistry.executeCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_STOP.id);
        let hndlr = this.commandRegistry.getActiveHandler(CommonCommands.CLOSE_ALL_MAIN_TABS.id);
        if (hndlr && hndlr.isEnabled) {
            this.commandRegistry.executeCommand(CommonCommands.CLOSE_ALL_MAIN_TABS.id);
        }
        hndlr = this.commandRegistry.getActiveHandler(EditorCommands.CLEAR_EDITOR_HISTORY.id);
        if (hndlr && hndlr.isEnabled) {
            this.commandRegistry.executeCommand(EditorCommands.CLEAR_EDITOR_HISTORY.id);
        }
    }

    getJavaServiceDebugConfig(): any {
        const workspaceFolderUri: any = this.workspaceVariables.getWorkspaceRootUri();
        return this.debugConfigurationManager.find(REMOTE_DEBUG_ID, workspaceFolderUri.toString());
    }

    createJavaServiceDebugConfig(): any {
        //TODO: Create it, then return it
        return this.getJavaServiceDebugConfig();
    }

    registerCommands(commandRegistry: CommandRegistry): void {

        let cmd = commandRegistry.getCommand(JavaServiceCommands.BACK_TO_ORIGIN_PROJECT.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.BACK_TO_ORIGIN_PROJECT, {
                isEnabled: widget => true,
                isVisible: widget => true,
                execute: () => {
                    this.handleGoBack(event);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_START.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_START, {
                execute: () => {
                    this.startRemoteDebugger(commandRegistry);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_STOP.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.DEBUG_INTEGRATION_SERVER_STOP, {
                execute: () => {
                    this.stopRemoteDebugger(commandRegistry);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.DEBUG_JAVA_SERVICE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.DEBUG_JAVA_SERVICE, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: widget => true,
                execute: () => {
                    if (JavaServiceCommandContribution.selectedJSNode) {
                        const colIdx = JavaServiceCommandContribution.selectedJSNode.javaService.indexOf(COLON);
                        const javaServiceName = JavaServiceCommandContribution.selectedJSNode.javaService.substring(colIdx + 1);
                        ServiceConfig.javaServiceName = javaServiceName;
                        ServiceConfig.breakpointsEnabled = undefined;
                        this.handleInvokeJavaService(ServiceConfig.javaServiceName);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.TOGGLE_DEBUG_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.TOGGLE_DEBUG_VIEW, {
                isEnabled: widget => true,
                isVisible: widget => true,
                execute: () => {
                    this.commandRegistry.executeCommand('debug:toggle');
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_CUT.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_CUT, {
                isEnabled: widget => this.isCutEnabled(),
                isVisible: widget => true,
                execute: () => {
                    if (!JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView) {
                        this.jserviceOutlineContribution.ignoreChanges = true;
                        this.editorManager.currentEditor.editor.focus();
                        this.commandRegistry.executeCommand(CommonCommands.CUT.id);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_COPY.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_COPY, {
                isEnabled: widget => this.isCopyEnabled(),
                isVisible: widget => true,
                execute: () => {
                    if (JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView) {
                        if (JavaServiceCommandContribution.selectedJSNode &&
                            JavaServiceCommandContribution.selectedJSNode.javaService) {

                            JavaServiceCommandContribution.copiedJavaService =
                                JavaServiceCommandContribution.selectedJSNode.javaService;
                        }
                    }
                    else {
                        this.editorManager.currentEditor.editor.focus();
                        this.commandRegistry.executeCommand(CommonCommands.COPY.id);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_PASTE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_PASTE, {
                isEnabled: widget => this.isPasteEnabled(),
                isVisible: widget => true,
                execute: () => {
                    if (JavaServiceCommandContribution.copiedJavaService) {
                        this.handlePasteJavaService();
                    }
                    else {
                        this.jserviceOutlineContribution.ignoreChanges = true;
                        this.editorManager.currentEditor.editor.focus();
                        this.commandRegistry.executeCommand(CommonCommands.PASTE.id);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_DUPLICATE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_DUPLICATE, {
                isEnabled: widget => this.isDuplicateEnabled(),
                isVisible: widget => true,
                execute: () => {
                    if (JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView) {
                        this.handleDuplicateJavaService();
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_TOGGLE_LINE_COMMENT.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_TOGGLE_LINE_COMMENT, {
                isEnabled: widget => this.isToggleLineCommentEnabled(),
                isVisible: widget => true,
                execute: () => {
                    this.jserviceOutlineContribution.ignoreChanges = true;
                    this.commandRegistry.executeCommand('editor.action.commentLine');
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JS_TOGGLE_BLOCK_COMMENT.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JS_TOGGLE_BLOCK_COMMENT, {
                isEnabled: widget => this.isToggleBlockCommentEnabled(),
                isVisible: widget => true,
                execute: () => {
                    this.jserviceOutlineContribution.ignoreChanges = true;
                    this.commandRegistry.executeCommand('editor.action.blockComment');
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.RUN_JAVA_SERVICE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.RUN_JAVA_SERVICE, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: widget => true,
                execute: () => {
                    if (JavaServiceCommandContribution.selectedJSNode) {
                        const colIdx = JavaServiceCommandContribution.selectedJSNode.javaService.indexOf(COLON);
                        const javaServiceName = JavaServiceCommandContribution.selectedJSNode.javaService.substring(colIdx + 1);
                        ServiceConfig.javaServiceName = javaServiceName;
                        const breakpointsEnabled = this.breakpointManager.breakpointsEnabled;
                        ServiceConfig.javaServiceName = javaServiceName;
                        ServiceConfig.breakpointsEnabled = breakpointsEnabled;
                        this.handleInvokeJavaService(ServiceConfig.javaServiceName);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.INPUT_OUTPUT.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.INPUT_OUTPUT, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: () => true,
                execute: (arg) => {
                    if (JavaServiceCommandContribution.selectedJSNode) {
                        const colIdx = JavaServiceCommandContribution.selectedJSNode.javaService.indexOf(COLON);
                        const javaServiceName = JavaServiceCommandContribution.selectedJSNode.javaService.substring(colIdx + 1);
                        ServiceConfig.javaServiceName = javaServiceName;
                    }
                    this.handleInputOutputSignature(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.LOG_BUSINESS_DATA.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.LOG_BUSINESS_DATA, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: () => true,
                execute: (arg) => {
                    if (arg && (arg as JavaServiceOutlineSymbolInformationNode).javaService) {
                        ServiceConfig.javaServiceName = (arg as JavaServiceOutlineSymbolInformationNode).javaService;
                    }
                    this.handleLogBusinessData(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.NEW_JAVA_SERVICE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.NEW_JAVA_SERVICE, {
                isEnabled: widget => (!ServiceConfig.isReadOnly),
                isVisible: widget => true,
                execute: () => {
                    this.handleNewJavaService();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.DELETE_JAVA_SERVICE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.DELETE_JAVA_SERVICE, {
                isEnabled: widget => this.isDeleteEnabled(),
                isVisible: widget => true,
                execute: (arg) => {
                    if (arg && arg.length > 0) {
                        this.handleDeleteJavaService(arg);
                    }
                    else if (JavaServiceCommandContribution.selectedJSNode) {
                        let javaServiceName = JavaServiceCommandContribution.selectedJSNode.javaService;
                        if (javaServiceName && javaServiceName.indexOf(COLON) > -1) {
                            javaServiceName = javaServiceName.substr(javaServiceName.indexOf(COLON) + 1);
                        }
                        this.handleDeleteJavaService([javaServiceName]);
                    }
                    else {
                        this.handleDeleteJavaService([ServiceConfig.javaServiceName]);
                    }
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JAVA_SUITE_SAVE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JAVA_SUITE_SAVE, {
                isEnabled: widget => this.isSaveEnabled(),
                isVisible: widget => true,
                execute: () => {
                    this.handleSave();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JAVA_SUITE_COMPILE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JAVA_SUITE_COMPILE, {
                isEnabled: widget => this.isCompileEnabled(),
                isVisible: widget => true,
                execute: () => {
                    this.handleCompile();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JAVA_SUITE_REFRESH.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JAVA_SUITE_REFRESH, {
                isEnabled: widget => this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
                    this.editorManager.currentEditor.editor instanceof MonacoEditor,
                isVisible: widget => true,
                execute: () => {
                    this.handleRefresh(true);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.JAVA_SUITE_SAVE_WITH_MESSAGE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.JAVA_SUITE_SAVE_WITH_MESSAGE, {
                isEnabled: widget => this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
                    this.editorManager.currentEditor.editor instanceof MonacoEditor &&
                    this.editorManager.currentEditor.editor.document.dirty,
                isVisible: widget => true,
                execute: () => {
                    this.handleSaveWithMessage(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.ONLINE_HELP.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.ONLINE_HELP, {
                isEnabled: widget => true,
                isVisible: widget => true,
                execute: () => alert('Online help')
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.INTRO_TOUR.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.INTRO_TOUR, {
                isEnabled: widget => true,
                isVisible: widget => true,
                execute: () => alert('Intro tour')
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.SCHEDULE.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.SCHEDULE, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: () => true,
                execute: (arg) => {
                    if (arg && (arg as JavaServiceOutlineSymbolInformationNode).javaService) {
                        ServiceConfig.javaServiceName = (arg as JavaServiceOutlineSymbolInformationNode).javaService;
                    }
                    this.handleSchedule(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.KEY_SHORTCUTS.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.KEY_SHORTCUTS, {
                isEnabled: () => true,
                isVisible: () => true,
                execute: () => {
                    alert('Key Shortcuts');
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.EXECUTION_HISTORY.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.EXECUTION_HISTORY, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: () => true,
                execute: (arg) => {
                    if (arg && (arg as JavaServiceOutlineSymbolInformationNode).javaService) {
                        ServiceConfig.javaServiceName = (arg as JavaServiceOutlineSymbolInformationNode).javaService;
                    }
                    this.handleExecutionHistory(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.VERSION_HISTORY.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.VERSION_HISTORY, {
                isEnabled: widget => JavaServiceCommandContribution.selectedJSNode !== null,
                isVisible: () => true,
                execute: (arg) => {
                    if (arg && (arg as JavaServiceOutlineSymbolInformationNode).javaService) {
                        ServiceConfig.javaServiceName = (arg as JavaServiceOutlineSymbolInformationNode).javaService;
                    }
                    this.handleVersionHistory(ServiceConfig.javaServiceName);
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.CLOSE_OUTLINE_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.CLOSE_OUTLINE_VIEW, {
                isEnabled: widget => this.jsOutlineViewContribution.withWidget(widget, output => true),
                isVisible: widget => this.jsOutlineViewContribution.withWidget(widget, output => true),
                execute: () => {
                    this.jsOutlineViewContribution.closeView();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.SHOW_LAST_INVOCATION_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.SHOW_LAST_INVOCATION_VIEW, {
                isEnabled: widget => true,
                isVisible: widget => true,
                execute: () => {
                    this.javaServiceInvokeViewContribution.openView({ activate: false, reveal: true });
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.CLOSE_LAST_INVOCATION_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.CLOSE_LAST_INVOCATION_VIEW, {
                isEnabled: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                isVisible: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                execute: () => {
                    this.javaServiceInvokeViewContribution.closeView();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.INFO_LAST_INVOCATION_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.INFO_LAST_INVOCATION_VIEW, {
                isEnabled: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                isVisible: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                execute: () => {
                    this.javaServiceInvokeViewContribution.resultsInfo();
                }
            });
        }

        cmd = commandRegistry.getCommand(JavaServiceCommands.DOWNLOAD_LAST_INVOCATION_VIEW.id);
        if (!cmd) {
            commandRegistry.registerCommand(JavaServiceCommands.DOWNLOAD_LAST_INVOCATION_VIEW, {
                isEnabled: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                isVisible: widget => this.javaServiceInvokeViewContribution.withWidget(widget, output => true),
                execute: () => {
                    this.javaServiceInvokeViewContribution.downloadResults();
                }
            });
        }

        this.unregisterCommands(commandRegistry);
    }

    registerMenus(menuModelRegistry: MenuModelRegistry): void {
        menuModelRegistry.registerMenuAction(JavaServiceHelpContextMenu.JS_HELP_MENU_GROUP, {
            commandId: JavaServiceCommands.ONLINE_HELP.id,
            label: nls.localize('commands.help.online.command', 'Online help'),
            order: '1'
        });

        menuModelRegistry.registerMenuAction(JavaServiceHelpContextMenu.JS_HELP_MENU_GROUP, {
            commandId: JavaServiceCommands.INTRO_TOUR.id,
            label: nls.localize('commands.help.intro.tour.command', 'Intro tour'),
            order: '2'
        });

        menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
            commandId: JavaServiceCommands.SHOW_REFERENCED_LIBS_VIEW.id,
            label: nls.localize('commands.third.party.libs.view.command', 'Referenced libraries'),
            order: '1'
        });

        // menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
        //     commandId: JavaServiceCommands.SCHEDULE.id,
        //     label: nls.localize('commands.schedule.command', 'Schedule'),
        //     order: '1'
        // });

        // menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
        //     commandId: JavaServiceCommands.KEY_SHORTCUTS.id,
        //     label: nls.localize('commands.key.shortcuts.command', 'Key shortcuts'),
        //     order: '2'
        // });

        // menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
        //     commandId: JavaServiceCommands.EXECUTION_HISTORY.id,
        //     label: nls.localize('commands.execution.history.command', 'Execution history'),
        //     order: '3'
        // });

        // menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
        //     commandId: JavaServiceCommands.VERSION_HISTORY.id,
        //     label: nls.localize('commands.version.history.command', 'Version history'),
        //     order: '4'
        // });

        // menuModelRegistry.registerMenuAction(JavaServiceMoreContextMenu.JS_MORE_MENU_GROUP, {
        //     commandId: JavaServiceCommands.SHOW_LAST_INVOCATION_VIEW.id,
        //     label: nls.localize('commands.last.invocation.view.command', 'Service results'),
        //     order: '5'
        // });

        menuModelRegistry.registerMenuAction(JavaServiceDebugContextMenu.DEBUG_JAVA_SERVICE_GROUP, {
            commandId: JavaServiceCommands.DEBUG_JAVA_SERVICE.id,
            label: nls.localize('commands.debug.java.service.command', 'Debug Java service'),
            order: '1'
        });

        menuModelRegistry.registerMenuAction(JavaServiceDebugContextMenu.DEBUG_JAVA_SERVICE_GROUP, {
            commandId: JavaServiceCommands.TOGGLE_DEBUG_VIEW.id,
            label: nls.localize('commands.toggle.debug.view.command', 'Toggle Debug View'),
            order: '2'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_CUT.id,
            label: nls.localize('action.bar.cut.text', 'Cut {0}', nls.localize('action.bar.selected.source', 'selected source')),
            order: '1'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_COPY.id,
            label: nls.localize('action.bar.copy.text', 'Copy {0}', nls.localize('action.bar.selected.source', 'selected source')),
            order: '2'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_PASTE.id,
            label: nls.localize('action.bar.paste.text', 'Paste {0}', nls.localize('action.bar.paste.into.source.text', 'into source')),
            order: '3'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_DUPLICATE.id,
            label: nls.localize('action.bar.duplicate.text', 'Duplicate Java service'),
            order: '4'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_TOGGLE_LINE_COMMENT.id,
            label: nls.localize('action.bar.toggle.line.comment.text', 'Toggle line comment'),
            order: '5'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsSourceContextMenu.EDIT_SOURCE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_TOGGLE_BLOCK_COMMENT.id,
            label: nls.localize('action.bar.toggle.block.comment.text', 'Toggle block comment'),
            order: '6'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_CUT.id,
            label: nls.localize('action.bar.cut.text', 'Cut {0}', nls.localize('action.bar.selected.source', 'selected source')),
            order: '1'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_COPY.id,
            label: nls.localize('action.bar.copy.text', 'Copy {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
            order: '2'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_PASTE.id,
            label: nls.localize('action.bar.paste.text', 'Paste {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
            order: '3'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_DUPLICATE.id,
            label: nls.localize('action.bar.duplicate.text', 'Duplicate Java service'),
            order: '4'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_TOGGLE_LINE_COMMENT.id,
            label: nls.localize('action.bar.toggle.line.comment.text', 'Toggle line comment'),
            order: '5'
        });

        menuModelRegistry.registerMenuAction(JavaServiceEditActionsOutlineContextMenu.EDIT_OUTLINE_ACTIONS_GROUP, {
            commandId: JavaServiceCommands.JS_TOGGLE_BLOCK_COMMENT.id,
            label: nls.localize('action.bar.toggle.block.comment.text', 'Toggle block comment'),
            order: '6'
        });

        menuModelRegistry.registerMenuAction(JavaServiceSaveContextMenu.JS_SAVE_MENU_GROUP, {
            commandId: JavaServiceCommands.JAVA_SUITE_SAVE_WITH_MESSAGE.id,
            label: nls.localize('commands.save.java.suite.with.message.command', 'Save with message'),
            icon: 'saveWithMessageIcon',
            order: '1'
        });
    }

    registerKeybindings(keybindings: KeybindingRegistry): void {
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+S",
            command: JavaServiceCommands.JAVA_SUITE_SAVE.id
        });
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+shift+d",
            command: JavaServiceCommands.TOGGLE_DEBUG_VIEW.id
        });
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+x",
            command: JavaServiceCommands.JS_CUT.id
        });
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+c",
            command: JavaServiceCommands.JS_COPY.id
        });
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+shift+v",
            command: JavaServiceCommands.JS_PASTE.id
        });
        keybindings.registerKeybinding({
            keybinding: "ctrlcmd+/",
            command: JavaServiceCommands.JS_TOGGLE_LINE_COMMENT.id
        });
        keybindings.registerKeybinding({
            keybinding: "shift+alt+a",
            command: JavaServiceCommands.JS_TOGGLE_BLOCK_COMMENT.id
        });
    }

    unregisterCommands(commandRegistry: CommandRegistry): void {
        let cmd = commandRegistry.getCommand('search-in-workspace.toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('search-in-workspace.open');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('fileNavigator:toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.files.action.focusFilesExplorer');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('navigator.refresh');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('navigator.reveal');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('navigator.collapse.all');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('pluginsView:toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('vsxExtensions.toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('vsxExtension.showInstalled');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('vsxExtension.showRecommendations');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('vsxExtension.showBuiltins');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('scm-history:open-file-history');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('scm-history:open-branch-history');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('scmView:toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('plugin.view-container.test.toggle');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('preferences:open');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('preferences:openJson.toolbar');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('preferences:reset');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.selectTheme');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.selectIconTheme');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('preferences:copyJson.value');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openFolderSettingsFile');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openWorkspaceSettingsFile');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openSettingsJson');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openFolderSettings');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openWorkspaceSettings');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('workbench.action.openGlobalSettings');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('keymaps.clearSearch');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('keymaps:open');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('keymaps:openJson');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
        cmd = commandRegistry.getCommand('keymaps:openJson.toolbar');
        if (cmd) {
            commandRegistry.unregisterCommand(cmd);
        }
    }

    private isCutEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        if (!JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView) {
            if (JavaServiceCommandContribution.currentSourceSelection) {
                return JavaServiceCommandContribution.currentSourceSelection.start &&
                    JavaServiceCommandContribution.currentSourceSelection.end &&
                    (JavaServiceCommandContribution.currentSourceSelection.start.line !==
                        JavaServiceCommandContribution.currentSourceSelection.end.line) ||
                    (JavaServiceCommandContribution.currentSourceSelection.start.character !==
                        JavaServiceCommandContribution.currentSourceSelection.end.character);
            }
        }
        else {
            return JavaServiceCommandContribution.selectedJSNode !== null ||
                this.jserviceOutlineContribution.deletedJavaServiceCount > 0;
        }
    }

    private isCopyEnabled(): boolean {

        if (JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView &&
            ServiceConfig.isReadOnly !== true) {
            return true;
        }
        else if (!JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView) {
            if (JavaServiceCommandContribution.currentSourceSelection) {
                if (JavaServiceCommandContribution.currentSourceSelection.start &&
                    JavaServiceCommandContribution.currentSourceSelection.end &&
                    (JavaServiceCommandContribution.currentSourceSelection.start.line !==
                        JavaServiceCommandContribution.currentSourceSelection.end.line) ||
                    (JavaServiceCommandContribution.currentSourceSelection.start.character !==
                        JavaServiceCommandContribution.currentSourceSelection.end.character)) {
                    return true;
                }
            }
        }
        else {
            return false;
        }
    }

    private isPasteEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        if (!JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView &&
            !JavaServiceCommandContribution.isRootSelectedInOutlineView) {

            return true;
        }

        return JavaServiceCommandContribution.copiedJavaService !== undefined;
    }

    private isDuplicateEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView === true;
    }

    private isDeleteEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return JavaServiceCommandContribution.selectedJSNode !== null ||
            this.jserviceOutlineContribution.deletedJavaServiceCount > 0;
    }

    private isSaveEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor &&
            this.editorManager.currentEditor.editor.document.dirty;
    }

    private isCompileEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor &&
            (!this.editorManager.currentEditor.editor.document.dirty);
    }

    private isToggleLineCommentEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return JavaServiceCommandContribution.currentSourceSelection !== null;
    }

    private isToggleBlockCommentEnabled(): boolean {
        if (ServiceConfig.isReadOnly) {
            return false;
        }
        return JavaServiceCommandContribution.currentSourceSelection !== null;
    }

    startRemoteDebugger(commandRegistry: CommandRegistry) {
        let javaServiceDebugConfig = this.getJavaServiceDebugConfig();
        if (!javaServiceDebugConfig) {
            javaServiceDebugConfig = this.createJavaServiceDebugConfig();
        }
        commandRegistry.executeCommand(DebugCommands.START.id, javaServiceDebugConfig);
    }

    stopRemoteDebugger(commandRegistry: CommandRegistry) {
        const javaServiceDebugConfig = this.getJavaServiceDebugConfig();
        commandRegistry.executeCommand(DebugCommands.STOP.id, javaServiceDebugConfig);
    }

    /**
     * Add a new Java service to the suite.
     */
    protected async handleNewJavaService(): Promise<void> {
        return this.getNewJavaServiceName();
    }

    protected async getNewJavaServiceName(): Promise<void> {
        const input = new SingleTextInputDialog({
            title: nls.localize('new.java.service.dialog.title', 'Create a new Java service'),
            initialValue: nls.localize('new.java.service.dialog.default.java.service.name', 'new_javaService'),
            validate: (input) => validateName(input, this.jserviceOutlineContribution.javaServices)
        });
        const javaServiceName = await input.open();
        if (javaServiceName !== undefined) {
            ServiceConfig.javaServiceName = javaServiceName;
            await this.handleCreateJavaService();
        }
    }

    protected async handleCreateJavaService() {
        if (this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor) {

            const progress = this.messageService.showProgress({
                text: nls.localize('progress.creating.java.service', 'Creating Java service')
            });

            await this.handleSave();

            try {
                const response = await this.invokeBackendService.createNewJavaService(
                    ServiceConfig.projectName,
                    ServiceConfig.javaServiceName,
                    ServiceConfig.serviceCommitMessage
                );
                if (response.errorCode) {
                    (await progress).cancel();
                    handleOther(response, this.invokeBackendService, this.commandRegistry);
                    return;
                }
                // console.log('*************** In createJavaService response');
                // TODO: The API should eventually return the new source.
                // When it does, reload it here.

                this.jserviceOutlineContribution.addJavaService(ServiceConfig.javaServiceName);

                await this.handleRefresh(false);

                const svcs: string = this.jserviceOutlineContribution.javaServicesWithoutIData;
                this.invokeBackendService.performScaffolding(svcs);

                // const widget = this.editorManager.currentEditor;
                // const monacoEditor = widget.editor as MonacoEditor;
                // await monacoEditor.document.sync();
                if (ServiceConfig.javaServiceName) {
                    this.selectNode(ServiceConfig.javaServiceName);
                }
            }
            catch (error) {
                handleError(error, this.messageService, 'rest.api.create.java.service.error.msg', 'Problem creating the Java service.\\\n{0}');
            }
            (await progress).cancel();
        }
    }

    protected async handlePasteJavaService() {
        if (JavaServiceCommandContribution.copiedJavaService &&
            this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor) {

            const progress = this.messageService.showProgress({
                text: nls.localize('progress.pasting.java.service', 'Pasting Java service')
            });

            let sourceJavaServiceName = JavaServiceCommandContribution.copiedJavaService;
            const colIdx = sourceJavaServiceName.indexOf(COLON);
            if (colIdx > -1) {
                sourceJavaServiceName = sourceJavaServiceName.substring(colIdx + 1);
            }

            const targetJavaServiceName = generateName(JavaServiceCommandContribution.copiedJavaService,
                this.jserviceOutlineContribution.javaServices);

            await this.handleSave();

            try {
                const response = await this.invokeBackendService.pasteJavaService(
                    ServiceConfig.projectName,
                    [sourceJavaServiceName],
                    [targetJavaServiceName],
                    ServiceConfig.serviceCommitMessage
                );

                if (response && response[PRIMARY_SOURCE]) {
                    const sourceContent = response[PRIMARY_SOURCE];
                    this.jserviceOutlineContribution.addJavaService(targetJavaServiceName);

                    const svcs: string = this.jserviceOutlineContribution.javaServicesWithoutIData;
                    this.invokeBackendService.performScaffolding(svcs);

                    await this.updateEditorSource(sourceContent);

                    this.selectNode(targetJavaServiceName);
                }
                else {
                    (await progress).cancel();
                    handleOther(response, this.invokeBackendService, this.commandRegistry);
                    return;
                }
            }
            catch (error) {
                handleError(error, this.messageService, 'rest.api.duplicate.java.service.error.msg', 'Problem duplicating the Java service.\\\n{0}');
            }
            (await progress).cancel();
        }
    }

    protected async handleDuplicateJavaService() {
        if (this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor) {

            const progress = this.messageService.showProgress({
                text: nls.localize('progress.duplicating.java.service', 'Duplicating Java service')
            });

            let sourceJavaServiceName = JavaServiceCommandContribution.selectedJSNode.javaService;
            const colIdx = sourceJavaServiceName.indexOf(COLON);
            if (colIdx > -1) {
                sourceJavaServiceName = sourceJavaServiceName.substring(colIdx + 1);
            }

            const targetJavaServiceName = generateName(JavaServiceCommandContribution.selectedJSNode.javaService,
                this.jserviceOutlineContribution.javaServices);

            await this.handleSave();

            try {
                const response = await this.invokeBackendService.duplicateJavaService(
                    ServiceConfig.projectName,
                    sourceJavaServiceName,
                    targetJavaServiceName,
                    ServiceConfig.serviceCommitMessage
                );

                if (response && response[PRIMARY_SOURCE]) {
                    const sourceContent = response[PRIMARY_SOURCE];
                    this.jserviceOutlineContribution.addJavaService(targetJavaServiceName);

                    const svcs: string = this.jserviceOutlineContribution.javaServicesWithoutIData;
                    this.invokeBackendService.performScaffolding(svcs);

                    await this.updateEditorSource(sourceContent);

                    this.selectNode(targetJavaServiceName);
                }
                else {
                    (await progress).cancel();
                    handleOther(response, this.invokeBackendService, this.commandRegistry);
                    return;
                }
            }
            catch (error) {
                handleError(error, this.messageService, 'rest.api.duplicate.java.service.error.msg', 'Problem duplicating the Java service.\\\n{0}');
            }
            (await progress).cancel();
        }
    }

    protected async handleDeleteJavaService(javaServiceNames: string[]) {

        let confirmed = false;
        let isLastService = false;

        if (this.jserviceOutlineContribution.deletedJavaServiceCount > 0) {
            if (javaServiceNames.length > 1) {
                if (this.jserviceOutlineContribution.deletedJavaServiceCount <
                    this.jserviceOutlineContribution.numberOfJavaServices) {
                    confirmed = await this.confirmDeleteMultipleJavaServices(javaServiceNames.length);
                }
                else {
                    confirmed = await this.confirmDeleteMultipleAndLastJavaServices(javaServiceNames.length);
                    isLastService = true;
                }
            }
            else {
                if (this.jserviceOutlineContribution.numberOfJavaServices > 1) {
                    confirmed = await this.confirmDeleteJavaService(javaServiceNames[0]);
                }
                else {
                    confirmed = await this.confirmDeleteLastJavaService(javaServiceNames[0]);
                    isLastService = true;
                }
            }
            if (!confirmed) {
                this.jserviceOutlineContribution.ignoreChanges = true;
                this.commandRegistry.executeCommand(CommonCommands.UNDO.id);
            }
            this.jserviceOutlineContribution.deletedJavaServiceCount = 0;
        }
        else {
            if (this.jserviceOutlineContribution.numberOfJavaServices > 1) {
                confirmed = await this.confirmDeleteJavaService(javaServiceNames[0]);
            }
            else {
                confirmed = await this.confirmDeleteLastJavaService(javaServiceNames[0]);
                isLastService = true;
            }
        }
        if (confirmed) {

            if (this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
                this.editorManager.currentEditor.editor instanceof MonacoEditor) {

                const progress = this.messageService.showProgress({
                    text: nls.localize('progress.deleting.java.service', 'Deleting Java service')
                });

                if (!isLastService) {
                    await this.handleSave();
                }

                try {
                    const response = await this.invokeBackendService.deleteJavaService(
                        ServiceConfig.projectName,
                        javaServiceNames,
                        ServiceConfig.serviceCommitMessage
                    );
                    if (response.errorCode) {
                        (await progress).cancel();
                        handleOther(response, this.invokeBackendService, this.commandRegistry);
                        return;
                    }
                    // console.log('*************** In deleteJavaService response');
                    this.jserviceOutlineContribution.removeJavaServices(javaServiceNames);
                    // TODO: The API should eventually return the new source.
                    // When it does, reload it here.
                    if (!isLastService) {
                        this.handleRefresh(false);
                    }

                    const svcs: string = this.jserviceOutlineContribution.javaServicesWithoutIData;
                    this.invokeBackendService.performScaffolding(svcs);

                    // const widget = this.editorManager.currentEditor;
                    // const monacoEditor = widget.editor as MonacoEditor;
                    // this.jserviceOutlineContribution.ignoreChanges = true;
                    // await monacoEditor.document.sync();
                } catch (error) {
                    handleError(error, this.messageService, 'rest.api.delete.java.service.error.msg', 'Problem deleting the Java service.\\\n{0}');
                }
                if (isLastService) {
                    const rootUri = this.workspaceService.tryGetRoots()[0].resource;
                    const javaServicesFolderPath = ServiceConfig.javaServicesFullPath;
                    const javaServicesFolderUri = rootUri.resolve(javaServicesFolderPath);
                    this.fileService.delete(javaServicesFolderUri, { recursive: true });
                    try {
                        await this.commandRegistry.executeCommand(EditorCommands.REVERT_AND_CLOSE.id);
                    }
                    catch (error) {
                        // do nothing, not a problem if this command fails
                    }
                    this.commandRegistry.executeCommand(JavaServiceCommands.BACK_TO_ORIGIN_PROJECT.id);
                }

                (await progress).cancel();
            }
        }
    }

    protected async confirmDeleteJavaService(javaServiceName: string): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title: nls.localize('delete.confirmation.title', 'Confirm Delete'),
            msg: nls.localize('delete.confirmation.msg', 'Are you sure you want to delete Java service {0}?', javaServiceName)
        });
        return !!await dialog.open();
    }

    protected async confirmDeleteLastJavaService(javaServiceName: string): Promise<boolean> {

        const msgNode = document.createElement('div');
        const message = document.createElement('p');
        message.textContent = nls.localize('delete.last.confirmation.msg', 'You are about to delete the last Java service in this suite. If you proceed, the suite will be deleted, and the editor will be closed.');
        const detail = document.createElement('p');
        detail.style.textAlign = 'center';
        detail.textContent = nls.localize('delete.confirmation.msg', 'Are you sure you want to delete Java service {0}?', javaServiceName);
        msgNode.append(message, detail);
        const dialog = new ConfirmDialog({
            title: nls.localize('delete.confirmation.title', 'Confirm Delete'),
            msg: msgNode,
        });
        return !!await dialog.open();
    }

    protected async confirmDeleteMultipleJavaServices(cnt: number): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title: nls.localize('delete.confirmation.title', 'Confirm Delete'),
            msg: nls.localize('delete.multiple.confirmation.msg', 'You are about to delete {0} Java services. Do you want to continue?', cnt)
        });
        return !!await dialog.open();
    }

    protected async confirmDeleteMultipleAndLastJavaServices(cnt: number): Promise<boolean> {

        const msgNode = document.createElement('div');
        const message = document.createElement('p');
        message.textContent = nls.localize('delete.multiple.and.last.confirmation.msg', 'You are about to delete {0} Java services including the last one. If you proceed, the suite will be deleted, and the editor will be closed.', cnt);
        const detail = document.createElement('p');
        detail.style.textAlign = 'center';
        detail.textContent = nls.localize('delete.multiple.confirmation.detail.msg', 'Are you sure you want to delete these Java services?');
        msgNode.append(message, detail);
        const dialog = new ConfirmDialog({
            title: nls.localize('delete.confirmation.title', 'Confirm Delete'),
            msg: msgNode,
        });
        return !!await dialog.open();
    }

    protected async handleSchedule(javaServiceName: string) {

        let progress;

        try {
            progress = this.messageService.showProgress({
                text: nls.localize('progress.retrieving.java.service.signature', 'Retrieving Java service signature')
            });
        } catch (error1) {
            (await progress).cancel();
            handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg', 'Problem retrieving the Java service signature.\\\n{0}');
            return;
        }

        const response = await this.invokeBackendService.getJavaServiceProperties(
            ServiceConfig.projectName,
            javaServiceName
        );

        if (response && response.svc_sig) {

            const signature: any = {
                sig_in: {},
                sig_out: {}
            };

            const signatureDetail = {
                svc_in_validator_options: "none",
                svc_out_validator_options: "none",
                svc_sig: signature
            }

            if (response.svc_sig && response.svc_sig.sig_in) {
                signature.sig_in = response.svc_sig.sig_in;
            }
            if (response.svc_sig && response.svc_sig.sig_out) {
                signature.sig_out = response.svc_sig.sig_out;
            }
            if (response.svc_in_validator_options) {
                signatureDetail.svc_in_validator_options = response.svc_in_validator_options;
            }
            if (response.svc_out_validator_options) {
                signatureDetail.svc_out_validator_options = response.svc_out_validator_options;
            }

            const scDialog = new SharedComponentsDialog(javaServiceName, signatureDetail, ACTION_SCHED,
                ServiceConfig.isReadOnly, this.commandRegistry);
            scDialog.open();
        }
        else {
            (await progress).cancel();
            handleOther(response, this.invokeBackendService, this.commandRegistry);
            return;
        }
        (await progress).cancel();
    }

    protected async handleExecutionHistory(javaServiceName: string) {
        const scDialog = new SharedComponentsDialog(javaServiceName, undefined, ACTION_EXHIST,
            ServiceConfig.isReadOnly, this.commandRegistry);
        scDialog.open();
    }

    protected async handleVersionHistory(javaServiceName: string) {
        const scDialog = new SharedComponentsDialog(javaServiceName, undefined, ACTION_VERHIST,
            ServiceConfig.isReadOnly, this.commandRegistry);
        scDialog.open();
    }

    protected async handleGoBack(event) {
        console.log("************handleGoBack");
        if (event && event.preventDefault) {
            if (event.stopPropagation)
                event.stopPropagation();
            event.preventDefault();
        }
        const hndlr = this.commandRegistry.getActiveHandler(CommonCommands.CLOSE_ALL_MAIN_TABS.id);
        if (hndlr && hndlr.isEnabled) {
            this.commandRegistry.executeCommand(CommonCommands.CLOSE_ALL_MAIN_TABS.id);
        }
        //Work around to the problem where need to click twice to go back to the cards page
        //iframe src /rest/jse/ui gets added to the browser history
        if (2 < history.length) {
            // window.history.back();
            window.history.go(-2);
        }
    }

    protected saveCurrentEditor() {

        const widget = this.editorManager.currentEditor;
        this.saveResourceService.save(widget, { formatType: FormatType.ON });
        // const hndlr = this.commandRegistry.getActiveHandler(CommonCommands.SAVE.id);
        // if (hndlr && hndlr.isEnabled) {
        //     this.commandRegistry.executeCommand(CommonCommands.SAVE.id);
        // }
    }

    protected async handleGetJavaServiceInfo() {
        try {
            const javaServiceInfo =
                new JavaServiceInfo("Default", "Proj4", "11111",
                    "Default", "EdgeProj4", "JS1", "edge.proj4.javaservices",
                    "http://localhost:4200", false, "11111", "11111");


            // await this.invokeBackendService.getJavaServiceInfo();
            // console.log('************** In handleGetJavaServiceInfo response');

            if (javaServiceInfo) {
                ServiceConfig.loadJavaServiceFromInfo(javaServiceInfo);
                ServiceConfig.javaSuiteTitle = nls.localize('java.suite.title', '{0}: Java services', ServiceConfig.projectName);
                let userName = '';
                // const userInfo = await this.invokeBackendService.getUserInfo();
                // if (userInfo && userInfo.integration && userInfo.integration.serviceData &&
                //     userInfo.integration.serviceData.user) {
                //     userName = userInfo.integration.serviceData.user.username;
                // }
                ServiceConfig.serviceNameAuthor = userName;
                ServiceConfig.serviceCommitMessage = nls.localize('git.commit.message', 'Commit made by: {0}', ServiceConfig.serviceNameAuthor);
                JavaServiceCommandContribution.edgeServerUnreachableMsg = nls.localize('rest.api.check.edge.server.error.msg', 'The edge server is unreachable');
            }
        }
        catch (error) {
            handleError(error, this.messageService, 'retrieve.java.service.info.error.msg', 'Problem retrieving the Java service information.\\\n{0}');
        }
    }

    getMonacoEditor(): MonacoEditor {
        let monacoEditor: MonacoEditor;
        if (this.editorManager) {
            const widget = this.editorManager.currentEditor;
            if (widget && widget.editor) {
                monacoEditor = widget.editor as MonacoEditor;
            }
        }
        return monacoEditor;
    }

    getEditorPosition(): Range {
        let position: Range;
        const monacoEditor = this.getMonacoEditor();
        if (monacoEditor) {
            const ranges = monacoEditor.getVisibleRanges();
            if (ranges && ranges.length > 0) {
                position = ranges[0]; //{ character: ranges[0].start.character, line: ranges[0].start.line };
            }
        }
        return position;
    }

    setEditorPosition() {
        const monacoEditor = this.getMonacoEditor();
        if (monacoEditor && JavaServiceCommandContribution.editorPositionBeforeRefresh) {
            setTimeout(() => {
                monacoEditor.revealRange(JavaServiceCommandContribution.editorPositionBeforeRefresh, { at: 'top' });
                JavaServiceCommandContribution.editorPositionBeforeRefresh = undefined;
            }, 50);
        }
    }

    getEditorSelection(): Range {
        let selection: Range;
        const monacoEditor = this.getMonacoEditor();
        if (monacoEditor) {
            selection = monacoEditor.selection;
        }
        return selection;
    }

    setEditorSelection() {
        const monacoEditor = this.getMonacoEditor();
        if (monacoEditor && JavaServiceCommandContribution.editorSelectionBeforeRefresh) {
            setTimeout(() => {
                monacoEditor.selection = JavaServiceCommandContribution.editorSelectionBeforeRefresh;
                JavaServiceCommandContribution.editorSelectionBeforeRefresh = undefined;
            }, 50);
        }
    }

    protected async handleRefresh(confirmRefresh: boolean) {

        JavaServiceCommandContribution.editorPositionBeforeRefresh = this.getEditorPosition();
        JavaServiceCommandContribution.editorSelectionBeforeRefresh = this.getEditorSelection();

        if (confirmRefresh) {
            const widget = this.editorManager.currentEditor;
            if (widget && widget.editor) {
                if (this.editorManager.currentEditor.editor.document.dirty) {
                    const confirmed = await this.confirmRefresh();
                    if (confirmed) {
                        const monacoEditor = widget.editor as MonacoEditor;
                        this.jserviceOutlineContribution.ignoreChanges = true;
                        monacoEditor.document.revert();
                        await this.handleSave();
                    }
                    else {
                        return;
                    }
                }
            }
        }

        const progress = this.messageService.showProgress({
            text: nls.localize('progress.refreshing.java.suite', 'Refreshing Java suite')
        });

        // console.log('************** FileURI:' + widget.editor.uri.toString());
        // console.log('************** FileURI Name:' + widget.editor.uri.path.name);
        // const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        // const workspaceUri = rootUri.path.toString();

        try {
            const response = {
                primarysource: this.javaClassText
            };



            //await this.invokeBackendService.getJavaClass(ServiceConfig.projectName);
            // console.log('************** In getJavaClass response');
            JavaServiceCommandContribution.selectedJSNodeBeforeRefresh = JavaServiceCommandContribution.selectedJSNode;
            if (response && response[PRIMARY_SOURCE]) {
                const sourceContent = response[PRIMARY_SOURCE];
                // console.log('************** In handleRefresh content');
                // console.log(content);
                this.isClassInWorkspace().then(isInWS => {
                    this.jserviceOutlineContribution.getJavaServices();
                    if (isInWS) {
                        this.referencedLibsService.updateJarFilesAndCreateRootNode();
                        this.updateEditorSource(sourceContent);
                    }
                    else {
                        // Not in the workspace, so add it
                        this.addClassToWorkspace(sourceContent);
                    }
                });
            }
            else {
                (await progress).cancel();
                handleOther(response, this.invokeBackendService, this.commandRegistry);
                return;
            }
        }
        catch (error) {
            handleError(error, this.messageService, 'rest.api.retrieve.java.class.error.msg', 'Problem retrieving the Java class.\\\n{0}');
        }

        (await progress).cancel();
    }

    async updateEditorSource(sourceContent: string) {
        const widget1 = this.editorManager.currentEditor;
        if (widget1 && widget1.editor) {
            const monacoEditor = widget1.editor as MonacoEditor;
            this.jserviceOutlineContribution.ignoreChanges = true;
            monacoEditor.getControl().setValue(sourceContent);
            // monacoEditor.document.save();
            this.saveCurrentEditor();
        }
        else {
            const rootUri = this.workspaceService.tryGetRoots()[0].resource;
            const fullClass = ServiceConfig.javaClassFullPath;
            const fullClassURI = rootUri.resolve(fullClass);
            this.fileService.write(fullClassURI, sourceContent);
        }
    }

    protected async confirmRefresh(): Promise<boolean> {
        const dialog = new ConfirmDialog({
            title: nls.localize('refresh.java.suite.unsaved.changes.title', 'Confirm refresh'),
            msg: nls.localize('refresh.java.suite.unsaved.changes.msg', 'There are unsaved changes in the editor.  If you refresh, your changes will be lost. Do you wish to continue?')
        });
        return !!await dialog.open();
    }

    async activateOutlineView() {
        const widget = this.editorManager.currentEditor;
        if (widget) {
            await this.shell.activateWidget(widget.id);
        }
        this.shell.activateWidget(OUTLINE_WIDGET_FACTORY_ID);
        await this.jsOutlineViewContribution.showOutlineView();
    }

    protected async handleSave() {
        this.saveCurrentEditor();
        this.handleSaveAndCompile(SAVE_ACTION, ServiceConfig.serviceCommitMessage);
    }

    protected async handleSaveWithMessage(javaServiceName: string) {
        const scDialog = new SharedComponentsDialog(javaServiceName, undefined, ACTION_SAVEWITHMSG,
            ServiceConfig.isReadOnly, this.commandRegistry);
        const serviceCommitMessage = await scDialog.open();
        if (serviceCommitMessage) {
            this.saveCurrentEditor();
            this.handleSaveAndCompile(SAVE_ACTION, serviceCommitMessage);
        }

        // this.handleSaveAndCompile(SAVE_ACTION);
    }

    protected async handleCompile() {
        this.handleSaveAndCompile(BUILD_ACTION, ServiceConfig.serviceCommitMessage);
    }

    protected async handleSaveAndCompile(action: string, serviceCommitMessage: string) {
        if (this.editorManager.currentEditor && this.editorManager.currentEditor.editor &&
            this.editorManager.currentEditor.editor instanceof MonacoEditor) {

            let progress;

            if (action === BUILD_ACTION) {
                progress = this.messageService.showProgress({
                    text: nls.localize('progress.compiling.java.suite', 'Compiling Java suite')
                });
            }
            else {
                progress = this.messageService.showProgress({
                    text: nls.localize('progress.saving.java.suite', 'Saving Java suite')
                });
            }

            try {
                this.jserviceOutlineContribution.ignoreChanges = true;

                const content = this.editorManager.currentEditor.editor.document.getText();
                // this.messageService.info(content);
                const encoded = this.encodingService.encode(content);

                const response = await this.invokeBackendService.saveOrCompileJavaClass(
                    ServiceConfig.projectName,
                    encoded,
                    action,
                    serviceCommitMessage
                );

                // console.log('************** In saveJavaClass response');
                // console.log(response);
                const monacoEditor = this.editorManager.currentEditor.editor as MonacoEditor;

                if (response && response[PRIMARY_SOURCE]) {
                    JavaServiceCommandContribution.editorPositionBeforeRefresh = this.getEditorPosition();
                    JavaServiceCommandContribution.editorSelectionBeforeRefresh = this.getEditorSelection();
                    JavaServiceCommandContribution.selectedJSNodeBeforeRefresh = JavaServiceCommandContribution.selectedJSNode;
                    const newContent = response[PRIMARY_SOURCE];
                    const svcs: string = this.jserviceOutlineContribution.javaServicesWithoutIData;
                    this.invokeBackendService.performScaffolding(svcs);
                    // console.log('************** In saveJavaClass content');
                    // console.log(content);
                    monacoEditor.getControl().setValue(newContent);
                    this.saveCurrentEditor();
                }
                else {
                    (await progress).cancel();
                    handleOther(response, this.invokeBackendService, this.commandRegistry);
                    return;
                }
            }
            catch (error) {
                console.error(error);
                handleError(error, this.messageService, 'rest.api.save.java.class.error.msg', 'Problem saving the Java class with action {0}.\\\n{1}', action);
            }

            (await progress).cancel();
        }
    }

    protected async handleInvokeJavaService(javaServiceName: string) {

        if (!ServiceConfig.javaServiceName) {
            alert(nls.localize('invoke.java.service.missing.selection.error.msg', 'You must select a Java service to invoke'));
            return;
        }

        const widget = this.editorManager.currentEditor;
        const editor = widget && widget.editor;
        if (!editor) {
            return;
        }
        if (!(widget.editor instanceof MonacoEditor)) {
            return;
        }
        // console.log('************** FileURI:' + widget.editor.uri.toString());
        // console.log('************** FileURI Name:' + widget.editor.uri.path.name);
        // const rootUri = this.workspaceService.tryGetRoots()[0].resource;
        // const workspaceUri = rootUri.path.toString();
        // let className = widget.editor.uri.path.toString();
        // if (className.startsWith(workspaceUri)) {
        //     className = className.substring(workspaceUri.length + 1);
        // }
        // if (className.endsWith(JAVA_EXT)) {
        //     className = className.substring(0, className.length - 5);
        // }

        if (ServiceConfig.breakpointsEnabled === true) {
            this.commandRegistry.executeCommand(DebugCommands.TOGGLE_BREAKPOINTS_ENABLED.id);
        }

        let progress;

        try {
            progress = this.messageService.showProgress({
                text: nls.localize('progress.retrieving.java.service.signature', 'Retrieving Java service signature')
            });
        } catch (error1) {
            (await progress).cancel();
            handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg', 'Problem retrieving the Java service signature.\\\n{0}');
            return;
        }

        const response = await this.invokeBackendService.getJavaServiceProperties(
            ServiceConfig.projectName,
            javaServiceName
        );
        (await progress).cancel();
        if (response && response.svc_sig) {

            const signature: any = {
                sig_in: {},
                sig_out: {}
            };

            const signatureDetail = {
                svc_in_validator_options: "none",
                svc_out_validator_options: "none",
                svc_sig: signature
            }

            if (response.svc_sig && response.svc_sig.sig_in) {
                signature.sig_in = response.svc_sig.sig_in;
            }
            if (response.svc_sig && response.svc_sig.sig_out) {
                signature.sig_out = response.svc_sig.sig_out;
            }
            if (response.svc_in_validator_options) {
                signatureDetail.svc_in_validator_options = response.svc_in_validator_options;
            }
            if (response.svc_out_validator_options) {
                signatureDetail.svc_out_validator_options = response.svc_out_validator_options;
            }

            // try {
            //     await this.handleSaveAndCompile(SAVE_ACTION, ServiceConfig.serviceCommitMessage);
            // } catch (error2) {
            //     (await progress).cancel();
            //     handleError(error2, this.messageService, 'rest.api.invoke.java.service.error.msg', 'Problem invoking the Java service.\\\n{0}');
            //     return;
            // }

            const scDialog = new SharedComponentsDialog(javaServiceName, signatureDetail, ACTION_RUN,
                ServiceConfig.isReadOnly, this.commandRegistry);
            scDialog.open();
        }
        else {
            (await progress).cancel();
            handleOther(response, this.invokeBackendService, this.commandRegistry);
            return;
        }
        (await progress).cancel();


        // try {
        //     const response = await this.invokeBackendService.debugService(
        //         folderNS, ServiceConfig.javaServiceName);
        //     // console.log('************** In handleInvokeJavaService response');
        //     if (ServiceConfig.breakpointsEnabled === true) {
        //         this.commandRegistry.executeCommand(DebugCommands.TOGGLE_BREAKPOINTS_ENABLED.id);
        //     }
        // }
        // catch (error) {
        //     handleError(error, this.messageService, 'rest.api.invoke.java.service.error.msg', 'Problem invoking the Java service.\\\n{0}');
        // }
    }

    async handleInputOutputSignature(javaServiceName: string) {

        let progress1;

        try {
            progress1 = this.messageService.showProgress({
                text: nls.localize('progress.retrieving.java.service.signature', 'Retrieving Java service signature')
            });

            const response = await this.invokeBackendService.getJavaServiceProperties(
                ServiceConfig.projectName,
                javaServiceName
            );
            (await progress1).cancel();
            if (response && response.svc_sig) {
                const signatureBefore: any = {
                    sig_in: {},
                    sig_out: {}
                };
                if (response.svc_sig && response.svc_sig.sig_in) {
                    signatureBefore.sig_in = response.svc_sig.sig_in;
                }
                if (response.svc_sig && response.svc_sig.sig_out) {
                    signatureBefore.sig_out = response.svc_sig.sig_out;
                }
                const signatureDetailBefore = {
                    svc_in_validator_options: "none",
                    svc_out_validator_options: "none",
                    svc_sig: signatureBefore
                }
                if (response.svc_in_validator_options) {
                    signatureDetailBefore.svc_in_validator_options = response.svc_in_validator_options;
                }
                if (response.svc_out_validator_options) {
                    signatureDetailBefore.svc_out_validator_options = response.svc_out_validator_options;
                }
                const scDialog = new SharedComponentsDialog(javaServiceName, signatureDetailBefore, ACTION_IO,
                    ServiceConfig.isReadOnly, this.commandRegistry);
                // scDialog.setData(javaServiceName, signature);
                const signatureDetailAfter = await scDialog.open();
                if (signatureDetailAfter) {
                    let progress2 = this.messageService.showProgress({
                        text: nls.localize('progress.updating.java.service.signature', 'Updating Java service signature')
                    });
                    const signatureDetailAfter1: any = {
                        svc_in_validator_options: "none",
                        svc_out_validator_options: "none",
                        svc_sig: {
                            sig_in: {},
                            sig_out: {}
                        },
                        gitComment: ServiceConfig.serviceCommitMessage
                    };
                    signatureDetailAfter1.svc_in_validator_options = signatureDetailAfter.svc_in_validator_options;
                    signatureDetailAfter1.svc_out_validator_options = signatureDetailAfter.svc_out_validator_options;
                    signatureDetailAfter1.svc_sig.sig_in = signatureDetailAfter.svc_sig.sig_in;
                    signatureDetailAfter1.svc_sig.sig_out = signatureDetailAfter.svc_sig.sig_out;
                    try {
                        const response3 = await this.invokeBackendService.setJavaServiceProperties(
                            ServiceConfig.projectName,
                            javaServiceName,
                            signatureDetailAfter1
                        );
                        this.handleRefresh(false);
                    } catch (error2) {
                        handleError(error2, this.messageService, 'rest.api.update.java.service.signature.error.msg', 'Problem updating the Java service signature.\\\n{0}');
                    }
                    (await progress2).cancel();
                }
            }
            else {
                (await progress1).cancel();
                handleOther(response, this.invokeBackendService, this.commandRegistry);
                return;
            }

        } catch (error1) {
            handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg', 'Problem retrieving the Java service signature.\\\n{0}');
        }
        (await progress1).cancel();
    }

    async handleLogBusinessData(javaServiceName: string) {

        let progress1;

        try {
            progress1 = this.messageService.showProgress({
                text: nls.localize('progress.retrieving.java.service.signature', 'Retrieving Java service signature')
            });

            const response = await this.invokeBackendService.getJavaServiceProperties(
                ServiceConfig.projectName,
                javaServiceName
            );
            (await progress1).cancel();
            if (response && response.svc_sig && response.svc_sig.sig_in && response.svc_sig.sig_out) {
                const signatureBefore: any = {
                    sig_in: {},
                    sig_out: {}
                };
                signatureBefore.sig_in = response.svc_sig.sig_in;
                signatureBefore.sig_out = response.svc_sig.sig_out;
                const scDialog = new SharedComponentsDialog(javaServiceName, signatureBefore, ACTION_BUSDATA,
                    ServiceConfig.isReadOnly, this.commandRegistry);
                // scDialog.setData(javaServiceName, signature);
                const signatureAfter = await scDialog.open();
                if (signatureAfter) {
                    let progress2 = this.messageService.showProgress({
                        text: nls.localize('progress.updating.java.service.signature', 'Updating Java service signature')
                    });
                    const signatureAfter1: any = {
                        svc_sig: {
                            sig_in: {},
                            sig_out: {}
                        },
                        gitComment: ServiceConfig.serviceCommitMessage
                    };
                    signatureAfter1.svc_sig.sig_in = signatureAfter.sig_in;
                    signatureAfter1.svc_sig.sig_out = signatureAfter.sig_out;
                    try {
                        const response2 = await this.invokeBackendService.setJavaServiceProperties(
                            ServiceConfig.projectName,
                            javaServiceName,
                            signatureAfter1
                        );
                    } catch (error2) {
                        handleError(error2, this.messageService, 'rest.api.update.java.service.signature.error.msg',
                            'Problem updating the Java service signature.\\\n{0}');
                    }
                    (await progress2).cancel();
                }
            }
            else {
                (await progress1).cancel();
                handleOther(response, this.invokeBackendService, this.commandRegistry);
                return;
            }
        } catch (error1) {
            handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg',
                'Problem retrieving the Java service signature.\\\n{0}');
        }
        (await progress1).cancel();
    }

    getFirstJavaService() {
        this.activateOutlineView();
        return this.jserviceOutlineContribution.getFirstJavaService();
    }

    async selectNode(javaServiceName?: string): Promise<void> {
        if (javaServiceName) {
            this.jserviceOutlineContribution.addJavaService(javaServiceName);
        }
        await this.activateOutlineView();
        const { model } = await this.jsOutlineViewContribution.widget;
        JavaServiceCommandContribution.nodeFound = false;

        const nodeSelected = setInterval(() => {
            const root = model.root;
            if (CompositeTreeNode.is(root)) {
                this.setReadOnlyMode();
                this.jserviceOutlineContribution.ignoreChanges = true;
                this.jserviceOutlineContribution.update();
                if (!javaServiceName) {
                    javaServiceName = this.getFirstJavaService();
                    if (javaServiceName) {
                        this.jserviceOutlineContribution.ignoreChanges = true;
                        this.jserviceOutlineContribution.addJavaService(javaServiceName);
                    }
                }
                if (javaServiceName) {
                    const node: any = model.getNode(javaServiceName + '(IData)_0');
                    if (node) {
                        JavaServiceCommandContribution.nodeFound = true;
                        this.jserviceOutlineContribution.ignoreChanges = true;
                        model.selectNode(node);
                        clearInterval(nodeSelected);
                        if (JavaServiceCommandContribution.editorPositionBeforeRefresh) {
                            this.setEditorPosition();
                        }

                        if (JavaServiceCommandContribution.editorSelectionBeforeRefresh) {
                            this.setEditorSelection();
                        }
                    }
                }
                else if (root.children && root.children.length > 0) {
                    JavaServiceCommandContribution.nodeFound = true;
                    clearInterval(nodeSelected);
                }
            }
        }, 250);
        setTimeout(() => {
            this.jserviceOutlineContribution.ignoreChanges = true;
            clearInterval(nodeSelected);
            if (!JavaServiceCommandContribution.nodeFound) {
                if (javaServiceName) {
                    console.error('Java service: ' + javaServiceName + ' not found in Outline View');
                }
                else {
                    console.error('No Java services found in Outline View');
                }
            }
        }, 30000);
    }

    setSelectedJavaService(node: CompositeTreeNode[], outlineSelection: boolean) {
        JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView = false;
        JavaServiceCommandContribution.isRootSelectedInOutlineView = false;
        JavaServiceCommandContribution.selectedJSNode = null;
        let selJSCount = 0;
        if (node && node.length > 0) {
            let tempSelectedJSNode;
            let isRoot = false;
            for (let j = 0; j < node.length; j++) {
                for (const childNode of node[j].children) {
                    if ((childNode as SelectableTreeNode).selected === true) {
                        selJSCount++;
                        if ((childNode as JavaServiceOutlineSymbolInformationNode).javaService &&
                            (childNode as JavaServiceOutlineSymbolInformationNode).selected === true) {
                            tempSelectedJSNode = childNode;
                        }
                        else if (childNode.parent && childNode.parent.id === 'outline-view-root') {
                            isRoot = true;
                        }
                    }
                }
            }
            if (selJSCount === 1 && tempSelectedJSNode) {
                JavaServiceCommandContribution.selectedJSNode = tempSelectedJSNode;
                JavaServiceCommandContribution.isJavaServiceSelectedInOutlineView = outlineSelection;
            }
            else if (selJSCount === 1 && isRoot) {
                JavaServiceCommandContribution.isRootSelectedInOutlineView = true;
            }
        }
        JavaServiceCommandContribution.selectedJSNodeBeforeRefresh = null;
        if (selJSCount === 0) {
            if (JavaServiceCommandContribution.editorPositionBeforeRefresh) {
                this.setEditorPosition();
            }

            if (JavaServiceCommandContribution.editorSelectionBeforeRefresh) {
                this.setEditorSelection();
            }
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}

export namespace JavaServiceEditActionsSourceContextMenu {
    export const EDIT_SOURCE_ACTIONS_MENU_PATH: MenuPath = ['js_edit_source_context_menu'];
    export const EDIT_SOURCE_ACTIONS_GROUP = [...EDIT_SOURCE_ACTIONS_MENU_PATH, '0_edit_source_actions'];
}

export namespace JavaServiceEditActionsOutlineContextMenu {
    export const EDIT_OUTLINE_ACTIONS_MENU_PATH: MenuPath = ['js_edit_outline_context_menu'];
    export const EDIT_OUTLINE_ACTIONS_GROUP = [...EDIT_OUTLINE_ACTIONS_MENU_PATH, '0_edit_outline_actions'];
}

export namespace JavaServiceDebugContextMenu {
    export const JAVA_SERVICE_DEBUG_MENU_PATH: MenuPath = ['js_debug_context_menu'];
    export const DEBUG_JAVA_SERVICE_GROUP = [...JAVA_SERVICE_DEBUG_MENU_PATH, '0_debug_java_service'];
}

export namespace JavaServiceSaveContextMenu {
    export const SAVE_MENU_PATH: MenuPath = ['js_save_context_menu'];
    export const JS_SAVE_MENU_GROUP = [...SAVE_MENU_PATH, '0_saveWithMessage'];
}

export namespace JavaServiceHelpContextMenu {
    export const HELP_MENU_PATH: MenuPath = ['js_help_context_menu'];
    export const JS_HELP_MENU_GROUP = [...HELP_MENU_PATH, '0_onlineHelp'];
}

export namespace JavaServiceMoreContextMenu {
    export const MORE_MENU_PATH: MenuPath = ['js_more_context_menu'];
    export const JS_MORE_MENU_GROUP = [...MORE_MENU_PATH, '0_moreItems'];
}
