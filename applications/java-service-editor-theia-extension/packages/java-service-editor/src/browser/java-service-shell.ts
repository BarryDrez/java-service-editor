import { MessageService } from '@theia/core';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';
import { Disposable, DisposableCollection, MenuModelRegistry } from '@theia/core/lib/common';
import { ApplicationShell, HoverService } from '@theia/core/lib/browser';
import { EditorWidget } from '@theia/editor/lib/browser';
import { Widget, Panel } from '@phosphor/widgets';
import { CommandRegistry } from '@theia/core/lib/common';
import { OutlineViewService } from '@theia/outline-view/lib/browser/outline-view-service';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { ContextMenuRenderer } from '@theia/core/lib/browser';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { nls } from '@theia/core/lib/common/nls';
import { BreakpointManager } from '@theia/debug/lib/browser/breakpoint/breakpoint-manager';
import { JavaServiceActionBar } from './java-service-action-bar';
import { InvokeBackendService } from '../common/protocol';

@injectable()
export class JavaServiceApplicationShell extends ApplicationShell implements Disposable {

    protected readonly initialHistoryLength: number;

    @inject(CommandRegistry)
    protected readonly commandRegistry: CommandRegistry;
    @inject(MenuModelRegistry)
    protected readonly menuModelRegistry: MenuModelRegistry;
    @inject(OutlineViewService)
    protected readonly outlineViewService: OutlineViewService;
    @inject(ContextMenuRenderer)
    protected readonly contextMenuRenderer: ContextMenuRenderer
    @inject(BreakpointManager)
    protected readonly breakpointManager: BreakpointManager;
    @inject(InvokeBackendService)
    protected readonly invokeBackendService: InvokeBackendService;
    @inject(MessageService)
    protected readonly messageService!: MessageService;
    @inject(WindowService)
    protected readonly windowService: WindowService;
    @inject(HoverService)
    protected readonly hoverService: HoverService;

    protected readonly toDispose = new DisposableCollection();

    @postConstruct()
    protected override async init(): Promise<void> {
        this.checkLocale();
        super.init();
        (this.topPanel as JavaServiceActionBar).init1(this.commandRegistry, this.menuModelRegistry,
            this.outlineViewService, this.contextMenuRenderer, this.breakpointManager);

        this.topPanel.show();
    }

    // Happens when resizing the browser, so update the rightPanelHandler size
    processMessage(msg) {
        super.processMessage(msg);
        this.rightPanelHandler.resize(0);
    }

    async addWidget(widget: Widget, options: Readonly<ApplicationShell.WidgetOptions> = {}): Promise<void> {
        if (options && options.area === 'left') {
            return;
        }
        if (['search-in-workspace', 'search-view-container', 'explorer-view-container', 'plugins',
            'vsx-extensions-view-container', 'scm-history', 'scm-view-container', 'scm-view',
            'settings_widget', 'test'].includes(widget.id) || widget.id.startsWith('plugin-view-container')) {
            return;
        }
        let area: ApplicationShell.Area = options.area || 'main';
        if (area === 'top') {
            return;
        }
        if (area === 'main' && widget instanceof EditorWidget && (widget as EditorWidget).editor) {
            (this.topPanel as JavaServiceActionBar).setEditorCommandsEnablement();
            this.toDispose.push((widget as EditorWidget).editor.onDocumentContentChanged(doc => {
                (this.topPanel as JavaServiceActionBar).setEditorCommandsEnablement();
            }));
            this.toDispose.push((widget as EditorWidget).editor.onSelectionChanged(selection => {
                (this.topPanel as JavaServiceActionBar).setEditorCommandsEnablement();
            }));
            this.toDispose.push(((widget as EditorWidget).editor as MonacoEditor).document.onDirtyChanged(() => {
                (this.topPanel as JavaServiceActionBar).editorEnablement =
                    ((widget as EditorWidget).editor as MonacoEditor).document.dirty;
                (this.topPanel as JavaServiceActionBar).setEditorCommandsEnablement();
                (this.topPanel as JavaServiceActionBar).dirtyChanged(
                    ((widget as EditorWidget).editor as MonacoEditor).document.dirty);
            }));
        }
        return super.addWidget(widget, options);
    }

    protected createTopPanel(): Panel {
        return new JavaServiceActionBar(this.invokeBackendService, this.messageService, this.hoverService);
    }

    getActionBar(): JavaServiceActionBar {
        return this.topPanel as JavaServiceActionBar;
    }

    checkLocale() {

        const localeId = window.localStorage.getItem(nls.localeId);
        if (!localeId) {
            this.windowService.setSafeToShutDown();
            window.localStorage.setItem(nls.localeId, 'en');  // TODO: Change this when other languages are supported
            this.windowService.reload();
        }
    }

    dispose(): void {
        this.toDispose.dispose();
    }
}
