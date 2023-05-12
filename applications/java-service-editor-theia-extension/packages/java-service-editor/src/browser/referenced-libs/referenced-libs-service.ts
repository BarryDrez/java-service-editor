import { injectable, inject } from '@theia/core/shared/inversify';
import { Event, Emitter } from '@theia/core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { nls } from '@theia/core/lib/common/nls';
import { MessageService } from '@theia/core';
import { handleError } from '../utils/java-service-utils';
import { TreeViewsExt } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
// import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { ReferencedLibsTreeModel } from './referenced-libs-tree-model';
import { JAVA_PROJECT_EXPLORER_ID, IPROJECT, IWORKSPACE, IREFERENCED_LIBRARIES } from './referenced-libs-constants';
import { ServiceConfig } from '../../common/java-service-config';
import { InvokeBackendService } from '../../common/protocol';
import { ReferencedLibsNode, Member } from './referenced-libs-node';
import { ReferencedLibsRootNode, MemberNode } from './referenced-libs-tree';
import { LIB_FOLDER } from './referenced-libs-constants';
import { pathExists } from 'fs-extra';

const path = require('path');

@injectable()
export class ReferencedLibsService {

	protected readonly onBeforeCreateRootEmitter = new Emitter<void>();
	protected readonly onAfterCreateRootEmitter = new Emitter<ReferencedLibsRootNode>();

	_treeModel: ReferencedLibsTreeModel;
	_proxy: TreeViewsExt;
	isProxyVisible = false;

	// fileTimer: NodeJS.Timer | undefined;

	constructor(
		@inject(WorkspaceService) private workspaceService: WorkspaceService,
		@inject(InvokeBackendService) private invokeBackendService: InvokeBackendService,
		@inject(MessageService) private messageService: MessageService,
		// @inject(FileService) private fileService: FileService
	) {
		// 	this.fileService.onDidFilesChange(event => {
		// 		if (event && event.changes && event.changes.length > 0) {
		// 			const roots = this.workspaceService.tryGetRoots();
		// 			if (roots && roots.length > 0) {
		// 				const rootUri = roots[0].resource;
		// 				const libFolder: string = rootUri.path.fsPath() + '/' + ServiceConfig.projectName + LIB_FOLDER;
		// 				let libFolderPosix = libFolder.split('\\').join(path.posix.sep);
		// 				libFolderPosix = libFolderPosix.replace('C:', '/c:');
		// 				event.changes.forEach(change => {
		// 					if (change.resource && change.resource.path) {
		// 						// Ignore updated and deleted files (only added)
		// 						const pathStr = change.resource.path.toString();
		// 						if (pathStr.startsWith(libFolderPosix)) {
		// 							if (this.fileTimer) {
		// 								clearTimeout(this.fileTimer);
		// 							}

		// 							this.fileTimer = setTimeout(() => {
		// 								this.createRootNode();
		// 							}, 1000);
		// 						}
		// 					}
		// 				});
		// 			}
		// 		}
		// 	});
	}

	isWin(): boolean {
		const roots = this.workspaceService.tryGetRoots();
		if (roots && roots.length > 0) {
			const rootUri = roots[0].resource;
			if (rootUri && rootUri.path && rootUri.path.root && rootUri.path.root.base && rootUri.path.root.base.endsWith(':')) {
				return true;
			}
		}
		return false;
	}

	get treeModel(): ReferencedLibsTreeModel {
		return this._treeModel;
	}

	set treeModel(treeModel: ReferencedLibsTreeModel) {
		this._treeModel = treeModel;
	}

	get proxy(): TreeViewsExt {
		return this._proxy;
	}

	set proxy(proxy: TreeViewsExt) {
		this._proxy = proxy;
	}

	setProxyVisible() {
		this.proxy.$setVisible(JAVA_PROJECT_EXPLORER_ID, true);
		this.isProxyVisible = true;
		this.updateJarFilesAndCreateRootNode();
	}

	get onBeforeCreateRoot(): Event<any> {
		return this.onBeforeCreateRootEmitter.event;
	}

	get onAfterCreateRoot(): Event<ReferencedLibsRootNode> {
		return this.onAfterCreateRootEmitter.event;
	}

	async createRootNode() {
		if (this.isProxyVisible === true) {
			this.onBeforeCreateRootEmitter.fire();

			await this.updateClasspath(1);

			let jarFiles: ReferencedLibsNode = {
				name: 'referenced-libs-node',
				children: [],
				id: 'referenced-libs-node',
				expanded: false,
				selected: false,
				parent: null,
				icon: ''
			};

			const root: ReferencedLibsRootNode = {
				id: 'referenced-libs-root',
				name: 'referenced-libs-root',
				visible: false,
				parent: undefined,
				children: [],
				jarFiles
			};

			let rootNodeQueryStr = IPROJECT + IREFERENCED_LIBRARIES;
			if (this.isWin()) {
				rootNodeQueryStr = IWORKSPACE + IREFERENCED_LIBRARIES;
			}

			let cnt = 0;
			try {
				let treeViewItems = await this.proxy.$getChildren(JAVA_PROJECT_EXPLORER_ID, rootNodeQueryStr);

				if (treeViewItems && treeViewItems.length > 0) {
					for (const item of treeViewItems) {
						const jarFile: Member = {
							name: item.label,
							description: item.description as string,
							children: [],
							icon: item.themeIcon.id,
							iconColor: item.themeIcon.color,
							id: item.id,
							expanded: false,
							selected: false,
							parent: null
						}
						await this.addChildren(jarFile);
						jarFiles.children.push(jarFile);
						cnt++;
					};
				}
			} catch (error) {
				// do nothing
			}
			this.treeModel.root = root;
			this.updateClasspath(cnt);
			this.onAfterCreateRootEmitter.fire(root as ReferencedLibsRootNode);
		}
	}

	memberNodeExpanded(parent: MemberNode) {
		if (parent.member && parent.member.children && parent.member.children.length > 0) {
			parent.member.children.forEach(child => {
				this.addChildren(child);
			});
		}
	}

	async addChildren(parent: Member) {
		if (!parent.children || parent.children.length === 0) {
			const children = await this.proxy.$getChildren(JAVA_PROJECT_EXPLORER_ID, parent.id);
			if (children && children.length > 0) {
				children.forEach(item => {
					const child: Member = {
						name: item.label,
						description: item.description as string,
						children: [],
						icon: item.themeIcon.id,
						iconColor: item.themeIcon.color,
						id: item.id,
						expanded: false,
						selected: false,
						parent: null
					}
					if (item.command && item.command.arguments && item.command.arguments.length > 0) {
						for (let arg of item.command.arguments) {
							if (arg.path) {
								child.uri = arg;
								break;
							}
						}
					}
					parent.children.push(child);
				});
			}
		}
	}

	async updateClasspath(numJars: number) {

		const roots = this.workspaceService.tryGetRoots();
		if (roots && roots.length > 0) {
			const rootUri = roots[0].resource;
			const remove: boolean = numJars == 0;
			this.invokeBackendService.updateClasspath(rootUri.path.fsPath(), ServiceConfig.projectName + path.sep + LIB_FOLDER, remove);
		}
	}

	async updateJarFilesAndCreateRootNode() {
		await this.getJarFilesInPackage();
		setTimeout(() => {
			this.createRootNode();
		}, 1000);
	}

	async getJarFilesInPackage() {

		let progress: any;
		let pathSep = path.sep;
		if (this.isWin()) {
			pathSep = '\\';
		}

		const roots = this.workspaceService.tryGetRoots();
		if (roots && roots.length > 0) {
			const rootUri = roots[0].resource;
			const libFolder: string = rootUri.path.fsPath() + pathSep + ServiceConfig.projectName + pathSep + LIB_FOLDER;
			try {
				progress = this.messageService.showProgress({
					text: nls.localize('progress.retrieving.third.party.jars', 'Retrieving referenced libraries from the server')
				});

				const response = await this.invokeBackendService.getJarFilesInPackage(
					ServiceConfig.packageName, libFolder, true
				);
				if (response && response.jars && response.jars.length > 0) {
					for (let jar of response.jars) {
						console.log('Downloaded Jar: ' + jar.name);
					}
				}
			} catch (error1) {
				handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg', 'Problem retrieving the Java service signature.\\\n{0}');
			}
		}
		(await progress).cancel();
	}

	async downloadJarFileInPackage(jarFile: string) {

		let progress: any;

		const roots = this.workspaceService.tryGetRoots();
		if (roots && roots.length > 0) {
			const rootUri = roots[0].resource;
			const libFolder: string = rootUri.path.fsPath() + '/' + ServiceConfig.projectName + path.sep + LIB_FOLDER;

			try {
				progress = this.messageService.showProgress({
					text: nls.localize('progress.retrieving.third.party.jar', 'Retrieving referenced library: {0}', jarFile)
				});

				const resp = await this.invokeBackendService.downloadJarFileInPackage(libFolder,
					ServiceConfig.packageName, jarFile
				);
				console.log(resp);
			} catch (error1) {
				handleError(error1, this.messageService, 'rest.api.retrieve.java.service.signature.error.msg', 'Problem retrieving the Java service signature.\\\n{0}');
			}
			(await progress).cancel();
		}
	}
}
