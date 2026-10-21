import type { DataStreamIdentifier } from '../data-providers/_lib/data-stream/types';
import type { CompleteLeafStructuralDescriptor, BaseStructuralDescriptor, MaterializedSeriesNode, SeriesNode, SeriesPath, BranchStructuralDescriptor } from './types';
/**
 * Check if two DataStreamIdentifier objects are equal.
 *
 * Performs deep equality check on all four identifier fields: dataProviderIdentifier.type, dataProviderIdentifier.id,
 * type, and id.
 */
export declare function dataStreamIdentifiersMatch({ identifierA, identifierB, }: {
    identifierA: DataStreamIdentifier;
    identifierB: DataStreamIdentifier;
}): boolean;
/**
 * Type guard for CompleteLeafStructuralDescriptor
 */
export declare function isCompleteLeafStructuralDescriptor(descriptor: BaseStructuralDescriptor<DataStreamIdentifier>): descriptor is CompleteLeafStructuralDescriptor<DataStreamIdentifier>;
export declare function isMaterializedSeriesNode(node: SeriesNode): node is MaterializedSeriesNode;
/**
 * Type guard for BranchStructuralDescriptor
 */
export declare function isBranchStructuralDescriptor(descriptor: BaseStructuralDescriptor<DataStreamIdentifier>): descriptor is BranchStructuralDescriptor<DataStreamIdentifier>;
/**
 * Recursively search a descriptor tree for a descriptor matching the given fieldPath.
 *
 * Returns the matched descriptor and its parent (if nested under a branch), or undefined if not found.
 */
export declare function findDescriptorWithParent({ descriptors, fieldPath, parent, }: {
    descriptors: ReadonlySet<BaseStructuralDescriptor<DataStreamIdentifier>>;
    fieldPath: SeriesPath;
    parent?: BaseStructuralDescriptor<DataStreamIdentifier>;
}): {
    descriptor: BaseStructuralDescriptor<DataStreamIdentifier>;
    parent?: BaseStructuralDescriptor<DataStreamIdentifier>;
} | undefined;
//# sourceMappingURL=utils.d.ts.map