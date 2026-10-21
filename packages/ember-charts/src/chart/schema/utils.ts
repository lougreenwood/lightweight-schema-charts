import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type {
  CompleteLeafStructuralDescriptor,
  BaseStructuralDescriptor,
  MaterializedSeriesNode,
  SeriesNode,
  SeriesPath,
  BranchStructuralDescriptor,
} from './types';

/**
 * Check if two DataStreamIdentifier objects are equal.
 *
 * Performs deep equality check on all four identifier fields: dataProviderIdentifier.type, dataProviderIdentifier.id,
 * type, and id.
 */
export function dataStreamIdentifiersMatch({
  identifierA,
  identifierB,
}: {
  identifierA: DataStreamIdentifier;
  identifierB: DataStreamIdentifier;
}): boolean {
  return (
    identifierA.dataProviderIdentifier.type ===
      identifierB.dataProviderIdentifier.type &&
    identifierA.dataProviderIdentifier.id ===
      identifierB.dataProviderIdentifier.id &&
    identifierA.type === identifierB.type &&
    identifierA.id === identifierB.id
  );
}

/**
 * Type guard for CompleteLeafStructuralDescriptor
 */
export function isCompleteLeafStructuralDescriptor(
  descriptor: BaseStructuralDescriptor,
): descriptor is CompleteLeafStructuralDescriptor {
  return descriptor.kind === 'series' && 'seriesKind' in descriptor;
}

export function isMaterializedSeriesNode(
  node: SeriesNode,
): node is MaterializedSeriesNode {
  return 'seriesApi' in node && typeof node.seriesApi !== 'undefined';
}

/**
 * Type guard for BranchStructuralDescriptor
 */
export function isBranchStructuralDescriptor(
  descriptor: BaseStructuralDescriptor,
): descriptor is BranchStructuralDescriptor {
  return descriptor.kind === 'structural';
}

/**
 * Recursively search a descriptor tree for a descriptor matching the given fieldPath.
 *
 * Returns the matched descriptor and its parent (if nested under a branch), or undefined if not found.
 */
export function findDescriptorWithParent({
  descriptors,
  fieldPath,
  parent,
}: {
  descriptors: ReadonlySet<BaseStructuralDescriptor>;
  fieldPath: SeriesPath;
  parent?: BaseStructuralDescriptor;
}):
  | { descriptor: BaseStructuralDescriptor; parent?: BaseStructuralDescriptor }
  | undefined {
  for (const descriptor of descriptors) {
    if (descriptor.identifier.fieldPath === fieldPath) {
      return { descriptor, parent };
    }

    if (isBranchStructuralDescriptor(descriptor)) {
      const found = findDescriptorWithParent({
        descriptors: descriptor.children,
        fieldPath,
        parent: descriptor,
      });
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}
