"use client";

import type { CategoryTreeNode } from "@/lib/types";
import { inputClass } from "./ui";

export function flattenCategoryTree(
  nodes: CategoryTreeNode[],
  depth = 0
): Array<CategoryTreeNode & { depth: number; pathLabel: string }> {
  const out: Array<CategoryTreeNode & { depth: number; pathLabel: string }> = [];
  for (const node of nodes) {
    const pathLabel = `${"— ".repeat(depth)}${node.name}`;
    out.push({ ...node, depth, pathLabel });
    if (node.children?.length) {
      out.push(...flattenCategoryTree(node.children, depth + 1));
    }
  }
  return out;
}

export function rootCategories(nodes: CategoryTreeNode[]): CategoryTreeNode[] {
  return nodes.filter((n) => !n.parent_id);
}

type TreeSelectProps = {
  tree: CategoryTreeNode[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  rootsOnly?: boolean;
  preferLeaves?: boolean;
  placeholder?: string;
  className?: string;
};

/** Hierarchical <select> for product or business category pickers. */
export function CategoryTreeSelect({
  tree,
  value,
  onChange,
  required,
  rootsOnly = false,
  preferLeaves = false,
  placeholder = "Select category",
  className,
}: TreeSelectProps) {
  const options = rootsOnly
    ? tree.map((n) => ({ ...n, depth: 0, pathLabel: n.name }))
    : flattenCategoryTree(tree);

  return (
    <select
      className={className || inputClass}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((node) => {
        return (
          <option key={node.id} value={node.id}>
            {node.pathLabel}
            {node.is_active === false ? " (inactive)" : ""}
            {preferLeaves && node.children?.length ? " (has subcategories)" : ""}
          </option>
        );
      })}
    </select>
  );
}
