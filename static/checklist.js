const resolveReferences = (checklistItems, activities) => {
    try {
        return checklistItems.flatMap(item => {
            if (!item.startsWith('~') && !item.startsWith('-~')) {
                return [item];
            }

            const isRemove = item.startsWith('-~');
            let reference = item.replace(/^-?~/, '').toLowerCase();
            const isOptional = reference.endsWith('?');
            if (isOptional) {
                reference = reference.slice(0, -1);
            }
            const referencedList = activities.find(list => list.name.toLowerCase() === reference);

            if (!referencedList) {
                return [item];
            }

            const expandedItems = resolveReferences(referencedList.items, activities);
            if (isRemove) {
                return expandedItems.map(listItem => '-' + listItem);
            }
            if (isOptional) {
                return expandedItems.map(listItem => listItem.endsWith('?') ? listItem : listItem + '?');
            }
            return expandedItems;
        });
    } catch {
        return [];
    }
};

const combineChecklists = (activities, selectedNames) => {
    const selected = new Set(selectedNames);
    const checklistItems = activities.flatMap(list => selected.has(list.name) ? list.items : []);

    const referencedResolved = resolveReferences(checklistItems, activities);
    const dedupedChecklistItems = [...new Set(referencedResolved)];

    const nonOptionalItems = new Set(
        dedupedChecklistItems.filter(item => !item.endsWith('?')).map(item => item.toLowerCase())
    );
    const optionalItemsFiltered = dedupedChecklistItems.filter(
        item => !(item.endsWith('?') && nonOptionalItems.has(item.slice(0, -1).toLowerCase()))
    );

    const itemsToRemove = new Set(
        optionalItemsFiltered.filter(item => item.startsWith('-')).map(item => item.slice(1).toLowerCase())
    );

    const removalListApplied = optionalItemsFiltered.filter(item =>
        !itemsToRemove.has(item.toLowerCase()) &&
        !(item.endsWith('?') && itemsToRemove.has(item.slice(0, -1).toLowerCase())) &&
        !item.startsWith('-')
    );

    return removalListApplied.map(item => item.replace(/(!!)$/, ''));
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { resolveReferences, combineChecklists };
} else if (typeof window !== 'undefined') {
    window.resolveReferences = resolveReferences;
    window.combineChecklists = combineChecklists;
}
