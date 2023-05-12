import { injectable, postConstruct, inject } from '@theia/core/shared/inversify';
import {
	ContextMenuRenderer,
	TreeProps,
	CompressedTreeWidget,
	TreeNode,
	ExpandableTreeNode,
	SelectableTreeNode,
	NodeProps,
	WidgetManager,
	ViewContainer
} from '@theia/core/lib/browser';
import URI from '@theia/core/lib/common/uri';
import * as React from '@theia/core/shared/react';
import { nls } from '@theia/core/lib/common/nls';
import { codicon } from '@theia/core/lib/browser/widgets';
import { HostedPluginSupport } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin';
import { HostedPluginServer } from '@theia/plugin-ext/lib/common/plugin-protocol';
import { JsonRpcProxy, Disposable, DisposableCollection } from '@theia/core';
import { RPCProtocol, RPCProtocolImpl } from '@theia/plugin-ext/lib/common/rpc-protocol';
import { BasicChannel } from '@theia/core/lib/common/message-rpc/channel';
import { Uint8ArrayReadBuffer, Uint8ArrayWriteBuffer } from '@theia/core/lib/common/message-rpc/uint8-array-message-buffer';
import { HostedPluginWatcher } from '@theia/plugin-ext/lib/hosted/browser/hosted-plugin-watcher';
import { MAIN_RPC_CONTEXT, TreeViewsExt } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { PluginViewRegistry } from '@theia/plugin-ext/lib/main/browser/view/plugin-view-registry';

// import { setUpPluginApi } from './main-context';
import { TreeViewsMainImpl } from '@theia/plugin-ext/lib/main/browser/view/tree-views-main';
import { PLUGIN_RPC_CONTEXT } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import { ReferencedLibsRootNode, MemberNode } from './referenced-libs-tree';
import { ReferencedLibsService } from './referenced-libs-service';
import { ReferencedLibsDetailsWidget, REFERENCED_LIBS_DETAILS_ID } from './referenced-libs-details-widget';

export type ReferencedLibsViewTreeWidgetFactory = () => ReferencedLibsViewTreeWidget;
export const ReferencedLibsViewTreeWidgetFactory = Symbol('ReferencedLibsViewTreeWidgetFactory');

import { ReferencedLibsTreeModel } from './referenced-libs-tree-model';
import { REFERENCED_LIBS_VIEW_ID, JAVA_PROJECT_EXPLORER_ID } from './referenced-libs-constants';

export const CLASS = 'referenced-libs';

@injectable()
export class ReferencedLibsViewTreeWidget extends CompressedTreeWidget {

	static readonly LABEL = nls.localize('third.party.libs.view.title', 'Referenced Libraries');

	referencedLibsService: ReferencedLibsService;
	pluginSupport: HostedPluginSupport;
	server: JsonRpcProxy<HostedPluginServer>;
	watcher: HostedPluginWatcher;
	proxy: TreeViewsExt;
	container: any;
	viewRegistry: PluginViewRegistry;
	widgetManager: WidgetManager;
	toDisconnect: DisposableCollection;

	constructor(
		@inject(TreeProps) readonly props: TreeProps,
		@inject(ReferencedLibsTreeModel) readonly model: ReferencedLibsTreeModel,
		@inject(ContextMenuRenderer) contextMenuRenderer: ContextMenuRenderer,
		@inject(ReferencedLibsService) referencedLibsService: ReferencedLibsService,
		@inject(WidgetManager) widgetManager: WidgetManager,
		@inject(HostedPluginSupport) pluginSupport: HostedPluginSupport,
		@inject(HostedPluginServer) server: JsonRpcProxy<HostedPluginServer>,
		@inject(HostedPluginWatcher) watcher: HostedPluginWatcher,
	) {
		super(props, model, contextMenuRenderer);

		this.referencedLibsService = referencedLibsService;
		this.referencedLibsService.treeModel = model;
		this.widgetManager = widgetManager;

		this.pluginSupport = pluginSupport;
		this.server = server;
		this.watcher = watcher;

		this.toDisconnect = new DisposableCollection(Disposable.create(() => { /* mark as connected */ }));

		this.toDispose.push(this.model.onSelectionChanged((nodes: SelectableTreeNode[]) => {
			if (nodes.length === 1) {
				const selNode: MemberNode = nodes[0] as MemberNode;
				if (selNode.member && selNode.member.uri) {
					this.showHideDetails(selNode.member);
				}
			}
		}
		));

		this.id = REFERENCED_LIBS_VIEW_ID;
		this.addClass(CLASS);
	}

	@postConstruct()
	protected override init(): void {
		super.init();
		this.showHideDetails();
	}

	async showHideDetails(member?: any) {
		const viewContainer = await this.widgetManager.getWidget('referenced-libs-container');
		if (viewContainer && viewContainer instanceof ViewContainer) {
			const detailsWidget: ReferencedLibsDetailsWidget =
				await this.widgetManager.getWidget(REFERENCED_LIBS_DETAILS_ID);
			const detailPart = (viewContainer as ViewContainer).getPartFor(detailsWidget);
			if (member && member.uri) {
				if (member.uri.path && detailsWidget.detailUri && detailsWidget.detailUri.path &&
					detailsWidget.detailUri.path.toString() === member.uri.path) {
					return;
				}
				detailsWidget.title.label = member.name;
				detailsWidget.title.caption = member.name;
				detailPart.title.closable = true;
				detailsWidget.title.iconClass = codicon('symbol-class');
				(detailsWidget as ReferencedLibsDetailsWidget).detailUri = new URI(member.uri);
				detailPart.show();

				viewContainer.containerLayout.setPartSizes([50, 50]);
			}
			else {
				detailPart.hide();
			}
		}
	}

	async handleProxy() {
		if (!this.referencedLibsService.proxy) {
			this.server.onDidCloseConnection(() => this.toDisconnect.dispose());

			let rpc = this.createServerRpc();
			// this.server.getExtPluginAPI();
			// const manager = rpc.getProxy(MAIN_RPC_CONTEXT.HOSTED_PLUGIN_MANAGER_EXT);
			// await manager.$init(null);

			// const treeViewsMain = new TreeViewsMainImpl(rpc, this.container);
			// rpc.set(PLUGIN_RPC_CONTEXT.TREE_VIEWS_MAIN, treeViewsMain);
			// treeViewsMain.$registerTreeDataProvider(JAVA_PROJECT_EXPLORER_ID, { canSelectMany: false });

			// setUpPluginApi(rpc, this.container);

			this.referencedLibsService.proxy = rpc.getProxy(MAIN_RPC_CONTEXT.TREE_VIEWS_EXT);
			this.toDisconnect.push(rpc);
		}
	}

	protected override render(): React.ReactNode {
		let node = super.render();
		return node;
	}

	protected override renderIcon(node: TreeNode, props: NodeProps): React.ReactNode {

		let DEFAULT_INFO_ICON = 'referenced-libs-icon ';
		if (MemberNode.is(node)) {
			let icon: string = node.member.icon;
			DEFAULT_INFO_ICON += codicon(node.member.icon);
		}

		return <div className={DEFAULT_INFO_ICON}></div>;
	}

	protected isExpandable(node: TreeNode): node is ExpandableTreeNode {
		if (ReferencedLibsRootNode.is(node)) {
			return true;
		}

		if (MemberNode.is(node)) {
			if (node.member && node.member.children && node.member.children.length > 0) {
				return true;
			}
		}

		return false;
	}

	protected createServerRpc(): RPCProtocol {

		const channel = new BasicChannel(() => {
			const writer = new Uint8ArrayWriteBuffer();
			writer.onCommit(buffer => {
				this.server.onMessage('main', buffer);
			});
			return writer;
		});

		// Create RPC protocol before adding the listener to the watcher to receive the watcher's cached messages after the rpc protocol was created.
		const rpc = new RPCProtocolImpl(channel);

		this.watcher.onPostMessageEvent(received => {
			if ('main' === received.pluginHostId) {
				channel.onMessageEmitter.fire(() => new Uint8ArrayReadBuffer(received.message));
			}
		});

		return rpc;
	}

	setContainer(c: any) {
		this.container = c;
		this.handleProxy();
	}
}
