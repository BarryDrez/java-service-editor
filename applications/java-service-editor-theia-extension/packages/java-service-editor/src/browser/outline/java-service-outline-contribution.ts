import { inject, injectable } from '@theia/core/shared/inversify';
import { MonacoOutlineContribution, MonacoOutlineSymbolInformationNode } from '@theia/monaco/lib/browser/monaco-outline-contribution';
import { StandaloneServices } from '@theia/monaco-editor-core/esm/vs/editor/standalone/browser/standaloneServices';
import { ILanguageFeaturesService } from '@theia/monaco-editor-core/esm/vs/editor/common/services/languageFeatures';
import URI from '@theia/core/lib/common/uri';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { MenuPath, DisposableCollection, Disposable } from '@theia/core/lib/common';
import { ITextModel } from '@theia/monaco-editor-core/esm/vs/editor/common/model';
import { DocumentSymbol } from '@theia/monaco-editor-core/esm/vs/editor/common/languages';
import { InvokeBackendService } from '../../common/protocol';
import { MonacoEditor } from '@theia/monaco/lib/browser/monaco-editor';
import { MessageService } from '@theia/core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { EditorOpenerOptions, Range } from '@theia/editor/lib/browser';
import * as monaco from '@theia/monaco-editor-core';
import { CommonCommands, ContextMenuRenderer, FrontendApplication } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { ServiceConfig } from '../../common/java-service-config';
import { handleError } from '../utils/java-service-utils';
import { JavaServiceCommands } from '../java-service-commands';

const NODELIST = 'nodeList';
const JAVA_EXT = '.java';
const IDATA_PARAM = '(IData)';
const COLON = ':';
const SLASH = '/';
const DOT = '.';
const RANGE = {
	"start": {
		"line": 1,
		"character": 0
	},
	"end": {
		"line": 1,
		"character": 0
	}
}

@injectable()
export class JavaServiceOutlineContribution extends MonacoOutlineContribution implements Disposable {

	@inject(InvokeBackendService)
	protected readonly invokeBackendService: InvokeBackendService;
	@inject(MessageService)
	protected readonly messageService!: MessageService;
	@inject(WorkspaceService)
	protected readonly workspaceService: WorkspaceService;
	@inject(ContextMenuRenderer)
	protected readonly contextMenuRenderer: ContextMenuRenderer
	@inject(CommandRegistry)
	protected readonly commandRegistry: CommandRegistry

	_javaServices: string[];
	rightMouseEvent = null;

	// deleteOccurred = false;

	_deletedJavaServiceCount = 0;
	_ignoreChanges = false;

	protected readonly toDispose = new DisposableCollection();

	onStart(app: FrontendApplication): void {
		super.onStart(app);

		// this.commandRegistry.onDidExecuteCommand(cmd => {
		// 	this.deleteOccurred = false;
		// 	if (cmd.commandId === 'deleteLeft' || cmd.commandId === 'deleteRight' ||
		// 		cmd.commandId === 'core.cut') {

		// 		this.deleteOccurred = true;
		// 	}
		// });

		const _self = this;
		document.body.onmousedown = function (e) {
			if (e.buttons === 2) {
				_self.rightMouseEvent = e;
			}
		}

		document.body.onmouseup = function (e) {
			//_self.rightMouseEvent = null;
		}
	}

	protected async selectInEditor(node: MonacoOutlineSymbolInformationNode, options?: EditorOpenerOptions): Promise<void> {
		await super.selectInEditor(node, options);
		if (ServiceConfig.javaSuiteName) {
			const ret = super.selectInEditor(node, options);
			node.selected = true;
			if (this.rightMouseEvent) {
				if ((node as JavaServiceOutlineSymbolInformationNode).javaService ||
					(node.parent && node.parent.id === 'outline-view-root')) {

					this.handleContextMenu(this.rightMouseEvent, node);
				}
			}

			return ret;
		}
		return undefined;
	}

	handleContextMenu(e: React.MouseEvent<HTMLElement, MouseEvent>, node: MonacoOutlineSymbolInformationNode): void {

		const args = [node];
		const x = e.clientX;
		const y = e.clientY;

		if (node.parent && node.parent.id === 'outline-view-root') {
			//       this.toDispose.push(Disposable.create(() =>
			setTimeout(() => this.contextMenuRenderer.render({
				menuPath: OUTLINE_ROOT_CONTEXT_MENU,
				anchor: { x, y },
				args
			}));
			//        ));
		}
		else {
			//       this.toDispose.push(Disposable.create(() =>
			setTimeout(() => this.contextMenuRenderer.render({
				menuPath: JAVA_SERVICE_CONTEXT_MENU,
				anchor: { x, y },
				args
			}));
			//        ));
		}

		e.stopPropagation();
		e.preventDefault();
		this.rightMouseEvent = null;
	}

	protected handleCurrentEditorChanged(): void {
		this.getJavaServices();
		super.handleCurrentEditorChanged();
	}

	loadJavaServicesIfNecessary() {
		if (!this._javaServices) {
			this.getJavaServices();
		}
	}

	addJavaService(jsName: string): boolean {

		if (this._javaServices) {
			const colonPos = jsName.indexOf(COLON);
			if (colonPos > 0) {
				jsName = jsName.substring(colonPos + 1);
			}
			if (this._javaServices.indexOf(jsName + IDATA_PARAM) < 0) {
				this._javaServices.push(jsName + IDATA_PARAM);
				return true;
			}
		}
		return false;
	}

	public get numberOfJavaServices(): number {
		if (this._javaServices) {
			return this._javaServices.length;
		}
		return 0;
	}

	getFirstJavaService(): string {
		let javaServiceName: string;
		if (this._javaServices && this._javaServices.length > 0) {
			javaServiceName = this._javaServices[0];
			if (javaServiceName.endsWith(IDATA_PARAM)) {
				javaServiceName = javaServiceName.substr(0, javaServiceName.length - IDATA_PARAM.length);
			}
		}
		return javaServiceName;
	}

	removeJavaServices(jsNames: string[]) {
		if (this._javaServices) {
			for (const jsName of jsNames) {
				let jsNameWithIData = jsName;
				if (!jsNameWithIData.endsWith(IDATA_PARAM)) {
					jsNameWithIData += IDATA_PARAM;
				}
				const index = this._javaServices.indexOf(jsNameWithIData);
				if (index > -1) {
					this._javaServices.splice(index, 1);
				}
			}
		}
	}

	protected createNodes(uri: URI, symbols: DocumentSymbol[]): MonacoOutlineSymbolInformationNode[] {
		const nodes: MonacoOutlineSymbolInformationNode[] = super.createNodes(uri, symbols);
		if (uri.displayName && uri.displayName.endsWith(JAVA_EXT)) {
			if (nodes && nodes.length > 0) {
				for (let j = 0; j < nodes.length; j++) {
					let i = 0;
					for (const node of nodes[j].children) {
						if (node.name && this._javaServices.indexOf(node.name) > -1) {
							nodes[j].children[i] = this.createJSNode(nodes[j].children[i]);
						}
						i++;
					}
				}
			}
		}
		return nodes;
	}

	private createJSNode(currNode: any): JavaServiceOutlineSymbolInformationNode {

		let name = currNode.name;
		const lParen = name.indexOf('(');
		if (lParen > 0) {
			name = name.substring(0, lParen);
		}
		const widget = this.editorManager.currentEditor;
		const editor = widget && widget.editor;
		if (!editor) {
			return;
		}
		if (!(widget.editor instanceof MonacoEditor)) {
			return;
		}
		const rootUri = this.workspaceService.tryGetRoots()[0].resource;
		const workspaceUri = rootUri.path.toString();
		let className = widget.editor.uri.path.toString();
		if (className.startsWith(workspaceUri)) {
			className = className.substring(workspaceUri.length + 1);
		}
		const firstSlash = className.indexOf(SLASH);
		const projectName = className.substring(0, firstSlash);

		if (className.startsWith(projectName)) {
			className = className.substring(projectName.length + 1);
		}
		if (className.endsWith(JAVA_EXT)) {
			className = className.substring(0, className.length - 5);
		}
		const folderNS = className.replace(/\//g, DOT);
		const javaServiceName = folderNS + COLON + name;

		const node: JavaServiceOutlineSymbolInformationNode = {
			uri: currNode.uri,
			id: currNode.id,
			iconClass: 'java-service-outline-view',
			originalName: currNode.name,
			name: currNode.name.substring(0, currNode.name.length - 7), // remove the signature (IData)
			children: currNode.children,
			parent: currNode.parent,
			range: currNode.range,
			fullRange: currNode.fullRange,
			selected: currNode.selected,
			expanded: currNode.expanded,
			detail: '', // currNode.detail,  currNode.detail contains : void 
			javaService: javaServiceName,
			package: projectName
		};
		return node;
	}

	public get javaServices(): string[] {
		return this._javaServices;
	}

	public get javaServicesWithoutIData(): string {
		let js = '';
		for (const javaService of this._javaServices) {
			js += javaService.substring(0, javaService.length - 7) + ',';
		}
		return js.substr(0, js.length - 1);
	}

	public async getJavaServices() {
		const editor = this.editorManager.currentEditor;
		if (editor && ServiceConfig.javaSuiteName) {
			this._javaServices = [];

			const widget = this.editorManager.currentEditor;
			const editor1 = widget && widget.editor;
			if (!editor1) {
				return;
			}
			if (!(widget.editor instanceof MonacoEditor)) {
				return;
			}
			console.log('*************** FileURI (outline view): ' + widget.editor.uri.toString());
			console.log('*************** FileURI Name: (outline view) ' + widget.editor.uri.path.name);
			// const rootUri = this.workspaceService.tryGetRoots()[0].resource;
			// const workspaceUri = rootUri.path.toString();
			// let className = widget.editor.uri.path.toString();
			// if (className.startsWith(workspaceUri)) {
			// 	className = className.substring(workspaceUri.length + 1);
			// }
			// const firstSlash = className.indexOf(SLASH);
			// const projectName = className.substring(0, firstSlash);

			// if (className.startsWith(projectName)) {
			// 	className = className.substring(projectName.length + 1);
			// }
			// if (className.endsWith(JAVA_EXT)) {
			// 	className = className.substring(0, className.length - 5);
			// }
			// className = className.replace(/\//g, DOT);

			try {
				const response = {
					nodeCount: 1,
					nodeList: [
						{
							"node_nsName": "edge.proj4.javaservices.Default:JS1",
							"LOCK_STATUS": 2,
							"node_pkg": "EdgeProj4",
							"node_type": {
								"type_name": "service",
								"subtype_name": "unknown"
							},
							"svc_type": "java",
							"svc_subtype": "default"
						}
					]
				};




				// await this.invokeBackendService.getJavaServices(
				// 	ServiceConfig.projectName);

				console.log('*************** In getJavaServices response (outline view)');

				if (response && response[NODELIST]) {
					const javaServices: any = response[NODELIST];
					console.log('*************** In createNodes javaServices (outline view)');
					console.log('*************** ' + javaServices);

					if (javaServices.length > 0) {
						for (const javaService of javaServices) {
							let jsName = javaService.node_nsName;
							this.addJavaService(jsName);
						}
					}
					super.handleCurrentEditorChanged();
				}
			} catch (error) {
				handleError(`${error}`, this.messageService, 'rest.api.retrieve.java.services.error.msg', 'Problem retrieving the Java services.\\\n{0}');
				super.handleCurrentEditorChanged();
			}
		}
	}

	public get deletedJavaServiceCount(): number {
		return this._deletedJavaServiceCount;
	}

	public set deletedJavaServiceCount(cnt: number) {
		this._deletedJavaServiceCount = cnt;
	}

	public set ignoreChanges(iC: boolean) {
		this._ignoreChanges = iC;
	}

	// protected async updateOutline(editorSelection?: Range): Promise<void> {
	// 	return super.updateOutline(editorSelection).then(() => {
	// 		this.checkForDeletedJavaServices1(editorSelection);
	// 	});
	// }

	// protected async checkForDeletedJavaServices1(editorSelection?: Range) {
	// 	const editor = MonacoEditor.get(this.editorManager.currentEditor);
	// 	const model = editor && editor.getControl().getModel();
	// 	this.checkForDeletedJavaServices(model, editorSelection);
	// }

	// protected async checkForDeletedJavaServices(model: monaco.editor.ITextModel | ITextModel, editorSelection?: Range) {

	// 	model = model as ITextModel;

	// 	const classNodes: string[] = [];

	// 	if (editorSelection === undefined || this._ignoreChanges) {
	// 		this._ignoreChanges = false;
	// 		return;
	// 	}
	// 	this._ignoreChanges = false;

	// 	const providers = StandaloneServices.get(ILanguageFeaturesService).documentSymbolProvider.all(model);
	// 	const token = this.tokenSource.token;
	// 	const uri = new URI(model.uri.toString());
	// 	let problemSymbols = true;

	// 	for (const provider of providers) {
	// 		try {
	// 			const symbols = await provider.provideDocumentSymbols(model, token);
	// 			if (token.isCancellationRequested) {
	// 				return;
	// 			}
	// 			problemSymbols = false;
	// 			const nodes: MonacoOutlineSymbolInformationNode[] = super.createNodes(uri, symbols);

	// 			if (uri.displayName && uri.displayName.endsWith(JAVA_EXT)) {
	// 				if (nodes && nodes.length > 0) {
	// 					for (const rootNode of nodes) {
	// 						for (const node of rootNode.children) {
	// 							if (node.name && this._javaServices.indexOf(node.name) > -1) {
	// 								classNodes.push(node.name);
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		} catch {
	// 			/* collect symbols from other providers */
	// 		}
	// 	}

	// 	if (problemSymbols) {
	// 		return;
	// 	}

	// 	this._deletedJavaServiceCount = 0;
	// 	const deletedJavaServices: string[] = [];
	// 	if (this._javaServices && this._javaServices.length > 0) {
	// 		if (classNodes.length > 0) {
	// 			for (const javaService of this._javaServices) {
	// 				const idx = classNodes.indexOf(javaService);
	// 				if (classNodes.indexOf(javaService) < 0) {
	// 					let javaServiceName = javaService;
	// 					if (javaServiceName.endsWith(IDATA_PARAM)) {
	// 						javaServiceName = javaServiceName.substr(0, javaServiceName.length - IDATA_PARAM.length);
	// 					}
	// 					deletedJavaServices.push(javaServiceName);
	// 				}
	// 			}
	// 		}
	// 		else {
	// 			for (let js of this._javaServices) {
	// 				if (js.endsWith(IDATA_PARAM)) {
	// 					js = js.substr(0, js.length - IDATA_PARAM.length);
	// 				}
	// 				deletedJavaServices.push(js);
	// 			}
	// 		}
	// 	}
	// 	if (deletedJavaServices.length > 0) {
	// 		for (const provider of providers) {
	// 			try {
	// 				const symbols = await provider.provideDocumentSymbols(model, token);
	// 				if (token.isCancellationRequested) {
	// 					return [];
	// 				}

	// 				const nodes: MonacoOutlineSymbolInformationNode[] = super.createNodes(uri, symbols);

	// 				if (uri.displayName && uri.displayName.endsWith(JAVA_EXT)) {
	// 					if (nodes && nodes.length > 0) {
	// 						for (const rootNode of nodes) {
	// 							for (const node of rootNode.children) {
	// 								if (node.name && this._javaServices.indexOf(node.name) > -1) {
	// 									classNodes.push(node.name);
	// 								}
	// 							}
	// 						}
	// 					}
	// 				}
	// 			} catch {
	// 				/* collect symbols from other providers */
	// 			}
	// 		}
	// 		this._deletedJavaServiceCount = deletedJavaServices.length;
	// 		setTimeout(() => {
	// 			this.commandRegistry.executeCommand(JavaServiceCommands.DELETE_JAVA_SERVICE.id, deletedJavaServices);
	// 		});
	// 	}
	// }

	async update(): Promise<void> {
		return await super.updateOutline(RANGE);
	}

	dispose(): void {
		this.toDispose.dispose();
	}
}

export const OUTLINE_ROOT_CONTEXT_MENU: MenuPath = ['OUTLINE_ROOT_CONTEXT_MENU'];
export namespace OutlineRootContextMenu {
	export const EDIT_OUTLINE_ROOT_ACTIONS_GROUP = [...OUTLINE_ROOT_CONTEXT_MENU, '1_ejs_or'];
}

export const JAVA_SERVICE_CONTEXT_MENU: MenuPath = ['JAVA_SERVICE_CONTEXT_MENU'];
export namespace JavaServiceContextMenu {
	export const IO_SIG = [...JAVA_SERVICE_CONTEXT_MENU, '1_io'];
	export const INVOKE_JS = [...JAVA_SERVICE_CONTEXT_MENU, '2_inv'];
	export const DEL_JS = [...JAVA_SERVICE_CONTEXT_MENU, '3_djs'];
	export const EDIT_OUTLINE_ACTIONS_GROUP = [...JAVA_SERVICE_CONTEXT_MENU, '4_ejs'];
}

export interface JavaServiceOutlineSymbolInformationNode extends MonacoOutlineSymbolInformationNode {
	package;
	javaService;
	originalName;
}