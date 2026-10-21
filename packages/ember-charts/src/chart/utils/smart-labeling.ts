import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { BaseStructuralDescriptor } from '../schema/types';

import { isBranchStructuralDescriptor } from '../schema/utils';

/**
 * Label part representing a selected item with optional structural prefix.
 *
 * - Prefix: immediate structural parent name, or '' for direct leaves under a container
 * - Label: the leaf label, or the composite group label if all selected
 */
export interface LabelPart {
  label: string;
  prefix: string;
}

/**
 * Selection state for sidebar fields.
 */
export type SelectionState = 'all' | 'none' | 'some' | false | true;

/**
 * Internal field model for building tree structure.
 */
export interface SidebarFieldModel {
  children?: ReadonlySet<SidebarFieldModel>;
  descriptor: BaseStructuralDescriptor<DataStreamIdentifier>;
  selectionState: SelectionState;
}

/**
 * Collect all leaf labels regardless of selection (flattened, no structure).
 */
export function collectAllLeafLabels(
  fields: ReadonlySet<SidebarFieldModel>,
): string[] {
  return fields.values().reduce((labels, field) => {
    if (field.children) {
      return labels.concat(collectAllLeafLabels(field.children));
    } else {
      return labels.concat([field.descriptor.label]);
    }
    return labels;
  }, [] as string[]);
}

/**
 * Container convenience helper for provider/stream label collection.
 *
 * @param   parentName - The container's label
 * @param   content    - Either streams or fields to collect from
 *
 * @returns            Formatted labels array and optional tooltip
 */
export function collectContainerLabels(
  parentName: string,
  content: {
    fields?: ReadonlySet<SidebarFieldModel>;
    streams?: ReadonlyArray<ReadonlySet<SidebarFieldModel>>;
  },
): { labels: string[]; tooltip?: string } {
  const parts: LabelPart[] = [];

  if (content.streams) {
    content.streams.forEach((streamFields) => {
      parts.push(...collectLabelsStructured(streamFields));
    });
  }

  if (content.fields) {
    parts.push(...collectLabelsStructured(content.fields));
  }

  const formatted = formatSmartLabels(parentName, parts);
  const result = formatLabelWithTruncation(parentName, formatted);
  return {
    labels: formatted,
    tooltip: result.tooltip,
  };
}

/**
 * Collect structured label parts from selected fields following universal rules:
 *
 * - Faceted: always emit individual leaves with prefix=group label
 * - Composite:
 *
 *   - All children selected -> emit a single part { prefix: '', label: groupLabel }
 *   - Some selected -> emit individual leaves with prefix=group label
 * - Direct leaves -> { prefix: '', label: leafLabel }
 * - Nested structures handled naturally via recursion
 */
export function collectLabelsStructured(
  fields: ReadonlySet<SidebarFieldModel>,
): ReadonlyArray<LabelPart> {
  return fields.values().reduce((parts, field) => {
    if (field.children) {
      const descriptor = field.descriptor;
      if (!isBranchStructuralDescriptor(descriptor)) {
        // Shouldn't happen, but be defensive:
        return parts.concat(
          collectSelectedLeafLabels(field.children).map<LabelPart>((leaf) => ({
            label: leaf,
            prefix: '',
          })),
        );
      }

      const selectedLeaves = collectSelectedLeafLabels(field.children);
      if (selectedLeaves.length === 0) {
        return parts; // nothing selected inside
      }

      const allLeaves = collectAllLeafLabels(field.children);
      const allSelected = selectedLeaves.length === allLeaves.length;

      if (descriptor.structuralGroupType === 'composite' && allSelected) {
        // Composite fully selected -> represent as a single unit
        return parts.concat([{ label: descriptor.label, prefix: '' }]);
      } else {
        // Faceted, or composite with partial selection -> emit individual leaves with group prefix
        return parts.concat(
          selectedLeaves.map<LabelPart>((leaf) => ({
            label: leaf,
            prefix: descriptor.label,
          })),
        );
      }
    } else if (
      field.selectionState === true ||
      field.selectionState === 'all'
    ) {
      // Direct leaf
      return parts.concat([{ label: field.descriptor.label, prefix: '' }]);
    }

    return parts;
  }, [] as LabelPart[]);
}

/**
 * Collect all selected leaf labels (flattened, no structure).
 */
export function collectSelectedLeafLabels(
  fields: ReadonlySet<SidebarFieldModel>,
): string[] {
  return fields.values().reduce((labels, field) => {
    if (field.children) {
      return labels.concat(collectSelectedLeafLabels(field.children));
    } else if (
      field.selectionState === true ||
      field.selectionState === 'all'
    ) {
      return labels.concat([field.descriptor.label]);
    }
    return labels;
  }, [] as string[]);
}

/**
 * Format label with item-count-based truncation and full tooltip.
 *
 * @param   baseLabel - The branch/group label (shown before suffix)
 * @param   labels    - List of formatted label strings from formatSmartLabels
 * @param   limit     - Maximum number of items to show before truncating (default: 5)
 *
 * @returns           Object with base label, optional suffix, and optional tooltip for truncated content
 */
export function formatLabelWithTruncation(
  baseLabel: string,
  labels: ReadonlyArray<string>,
  limit: number = 5,
): { label: string; labelSuffix?: string; tooltip?: string } {
  if (labels.length === 0) {
    return { label: baseLabel };
  }

  if (labels.length <= limit) {
    return {
      label: baseLabel,
      labelSuffix: `(${labels.join(', ')})`,
    };
  }

  const visible = labels.slice(0, limit);
  const remaining = labels.length - limit;
  const tooltip = labels.join(', ');

  return {
    label: baseLabel,
    labelSuffix: `(${visible.join(', ')}, +${remaining} more)`,
    tooltip,
  };
}

/**
 * Format label parts into human-friendly strings with smart prefix handling.
 *
 * Rules:
 *
 * 1. Group by prefix
 * 2. If single group and prefix === parentName (case-insensitive) -> drop prefix entirely
 * 3. For each group:
 *
 *    - 1 item: prefix ? `${prefix} ${item}` : item
 *    - N>1 items: prefix ? `${prefix} [a, b, c]` : `a, b, c`
 * 4. Return formatted list of group strings
 *
 * @param   parentName - The parent branch/group label
 * @param   parts      - Structured label parts to format
 *
 * @returns            Array of formatted label strings (without base label, ready for truncation)
 */
export function formatSmartLabels(
  parentName: string,
  parts: ReadonlyArray<LabelPart>,
): string[] {
  if (parts.length === 0) {
    return [];
  }

  // Group by prefix
  const grouped = parts.reduce<Map<string, string[]>>((map, part) => {
    const key = part.prefix;
    const next = map.get(key) ?? [];
    next.push(part.label);
    map.set(key, next);
    return map;
  }, new Map<string, string[]>());

  // Case-insensitive match for redundant prefix removal
  const parentLower = parentName.toLowerCase();

  if (grouped.size === 1) {
    const keys = Array.from(grouped.keys());
    const onlyPrefix = keys[0];
    if (onlyPrefix !== undefined && onlyPrefix.toLowerCase() === parentLower) {
      // Drop the redundant prefix entirely
      return grouped.get(onlyPrefix) ?? [];
    }
  }

  // Format each group
  const formattedGroups: string[] = [];
  grouped.forEach((labels, prefix) => {
    if (!labels || labels.length === 0) {
      return;
    }

    if (labels.length === 1) {
      // Single item - use chevron to show hierarchy
      const item = labels[0];
      if (item !== undefined) {
        formattedGroups.push(prefix ? `${prefix} > ${item}` : item);
      }
    } else {
      // Multiple items -> bracketed with chevron prefix
      const joined = labels.join(', ');
      formattedGroups.push(prefix ? `${prefix} > [${joined}]` : joined);
    }
  });

  return formattedGroups;
}
