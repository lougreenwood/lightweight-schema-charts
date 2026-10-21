/**
 * Check if two DataStreamIdentifier objects are equal.
 *
 * Performs deep equality check on all four identifier fields: dataProviderIdentifier.type, dataProviderIdentifier.id,
 * type, and id.
 */
function dataStreamIdentifiersMatch({
  identifierA,
  identifierB
}) {
  return identifierA.dataProviderIdentifier.type === identifierB.dataProviderIdentifier.type && identifierA.dataProviderIdentifier.id === identifierB.dataProviderIdentifier.id && identifierA.type === identifierB.type && identifierA.id === identifierB.id;
}

/**
 * Type guard for CompleteLeafStructuralDescriptor
 */
function isCompleteLeafStructuralDescriptor(descriptor) {
  return descriptor.kind === 'series' && 'seriesKind' in descriptor;
}
function isMaterializedSeriesNode(node) {
  return 'seriesApi' in node && typeof node.seriesApi !== 'undefined';
}

/**
 * Type guard for BranchStructuralDescriptor
 */
function isBranchStructuralDescriptor(descriptor) {
  return descriptor.kind === 'structural';
}

/**
 * Recursively search a descriptor tree for a descriptor matching the given fieldPath.
 *
 * Returns the matched descriptor and its parent (if nested under a branch), or undefined if not found.
 */
function findDescriptorWithParent({
  descriptors,
  fieldPath,
  parent
}) {
  for (const descriptor of descriptors) {
    if (descriptor.identifier.fieldPath === fieldPath) {
      return {
        descriptor,
        parent
      };
    }
    if (isBranchStructuralDescriptor(descriptor)) {
      const found = findDescriptorWithParent({
        descriptors: descriptor.children,
        fieldPath,
        parent: descriptor
      });
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

export { dataStreamIdentifiersMatch, findDescriptorWithParent, isBranchStructuralDescriptor, isCompleteLeafStructuralDescriptor, isMaterializedSeriesNode };
//# sourceMappingURL=utils.js.map
