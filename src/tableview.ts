import { Node } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import { CellAttrs } from './util';

/**
 * @public
 */
export class TableView implements NodeView {
  public dom: HTMLDivElement;
  public table: HTMLTableElement;
  public colgroup: HTMLTableColElement;
  public contentDOM: HTMLTableSectionElement;

  constructor(public node: Node, public cellMinWidth: number, public wrapperClassNames: string[], public view: EditorView, public getPos: () => number|undefined) {
    this.view = view;
    this.getPos = getPos;
    
    this.dom = document.createElement('div');
    this.dom.className = 'tableWrapper';
    wrapperClassNames.forEach((className) => this.dom.classList.add(className))
    
    this.table = this.dom.appendChild(document.createElement('table'));
    this.table.className = node.attrs.class || '';
    
    this.colgroup = this.table.appendChild(document.createElement('colgroup'));
    
    updateColumnsOnResize(node, this.colgroup, this.table, cellMinWidth);
    
    this.contentDOM = this.table.appendChild(document.createElement('tbody'));

    setTimeout(() => {
      this.view.dispatch(this.view.state.tr.setNodeAttribute(this.getPos()!, 'defaultWidth', this.table.offsetWidth).setMeta('addToHistory', false))
    }, 0)
    
  }

  update(node: Node): boolean {
    if (node.type != this.node.type) return false; 
    if (node.attrs !== this.node.attrs) {
      this.node = node
      this.table.className = node.attrs.class
      return true
    }
    this.node = node;
    updateColumnsOnResize(node, this.colgroup, this.table, this.cellMinWidth);
    return true;
  }

  ignoreMutation(record: MutationRecord): boolean {
    return (
      record.type == 'attributes' &&
      (record.target == this.table || this.colgroup.contains(record.target))
    );
  }
}

/**
 * @public
 */
export function updateColumnsOnResize(
  node: Node,
  colgroup: HTMLTableColElement,
  table: HTMLTableElement,
  cellMinWidth: number,
  overrideCol?: number,
  overrideValue?: number,
): void {
  let totalWidth = 0;
  let fixedWidth = true;
  let nextDOM = colgroup.firstChild as HTMLElement;
  const row = node.firstChild;
  if (!row) return;

  for (let i = 0, col = 0; i < row.childCount; i++) {
    const { colspan, colwidth } = row.child(i).attrs as CellAttrs;
    for (let j = 0; j < colspan; j++, col++) {
      const hasWidth =
        overrideCol == col ? overrideValue : colwidth && colwidth[j];
      const cssWidth = hasWidth ? hasWidth + 'px' : '';
      totalWidth += hasWidth || cellMinWidth;
      if (!hasWidth) fixedWidth = false;
      if (!nextDOM) {
        colgroup.appendChild(document.createElement('col')).style.width =
          cssWidth;
      } else {
        if (nextDOM.style.width != cssWidth) nextDOM.style.width = cssWidth;
        nextDOM = nextDOM.nextSibling as HTMLElement;
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling;
    nextDOM.parentNode?.removeChild(nextDOM);
    nextDOM = after as HTMLElement;
  }

  if (fixedWidth) {
    table.style.width = totalWidth + 'px';
    table.style.minWidth = '';
  } else {
    table.style.width = '';
    table.style.minWidth = totalWidth + 'px';
  }
}
