import {
  SelectableTreeNode,
  ExpandableTreeNode,
  TreeNode
} from '@theia/core/lib/browser';
import { ThemeColor } from '@theia/plugin-ext/lib/common/plugin-api-rpc';
import URI from '@theia/core/lib/common/uri';

export interface ReferencedLibsNode extends ExpandableTreeNode, SelectableTreeNode {
  name: string;
  children: Member[];
}

export namespace ReferencedLibsNode {
  export function is(node: TreeNode | undefined): node is ReferencedLibsNode {
    return ExpandableTreeNode.is(node) && SelectableTreeNode.is(node) && 'categoryId' in node;
  }
}

export interface Member extends ExpandableTreeNode, SelectableTreeNode {
  name: string;
  // path: string;
  children: Member[];
  icon: string;
  iconColor: ThemeColor,
  description: string;
  uri?: URI;
}

export namespace Member {
  export function is(node: TreeNode | undefined): node is Member {
    return ExpandableTreeNode.is(node) && SelectableTreeNode.is(node) && 'categoryId' in node;
  }
}
