import {
  TreeImpl,
  CompositeTreeNode,
  TreeNode,
  ExpandableTreeNode,
  SelectableTreeNode
} from '@theia/core/lib/browser';
import { injectable } from 'inversify';

import { Member, ReferencedLibsNode } from './referenced-libs-node';

@injectable()
export class ReferencedLibsTree extends TreeImpl {
  protected resolveChildren(parent: CompositeTreeNode): Promise<TreeNode[]> {
    if (ReferencedLibsRootNode.is(parent)) {
      return Promise.resolve(
        parent.jarFiles.children.map(m => this.makeMemberNode(m))
      );
    }

    if (MemberNode.is(parent) && parent.children) {
      return Promise.resolve(
        parent.member.children?.map(m => this.makeMemberNode(m)) || []
      );
    }

    return Promise.resolve(Array.from(parent.children));
  }

  makeMemberNode(m: Member) {
    const node: MemberNode = {
      id: m.name,
      name: `${m.name}`,
      parent: undefined,
      expanded: false,
      selected: false,
      children: [],
      member: m,
      icon: '',
      iconColor: ''
    };
    return node;
  }
}

export interface ReferencedLibsRootNode extends CompositeTreeNode {
  jarFiles: ReferencedLibsNode;
}

export namespace ReferencedLibsRootNode {
  export function is(node: object): node is ReferencedLibsRootNode {
    return !!node && 'jarFiles' in node;
  }
}

export interface MemberNode
  extends CompositeTreeNode,
  ExpandableTreeNode,
  SelectableTreeNode {
  member: Member;
  icon: string;
  iconColor: string;
}

export namespace MemberNode {
  export function is(node: object): node is MemberNode {
    return !!node && 'member' in node;
  }
}
