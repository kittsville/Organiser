const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { resolveReferences, combineChecklists } = require('./static/checklist.js');

describe('passthrough', () => {
    it('returns plain items unchanged', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'Hat'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks', 'Hat']);
    });

    it('returns empty list for empty selection', () => {
        const activities = [{ name: 'Pack', items: ['Socks'] }];
        assert.deepEqual(combineChecklists(activities, []), []);
    });
});

describe('positive references', () => {
    it('expands a one-level reference', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base', 'Passport'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks', 'Hat', 'Passport']);
    });

    it('expands references recursively', () => {
        const activities = [
            { name: 'Core', items: ['Socks'] },
            { name: 'Base', items: ['~Core', 'Hat'] },
            { name: 'Trip', items: ['~Base'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks', 'Hat']);
    });

    it('leaves missing references as literals', () => {
        const activities = [{ name: 'Trip', items: ['~Missing', 'Socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['~Missing', 'Socks']);
    });

    it('resolves references case-insensitively by list name', () => {
        const activities = [
            { name: 'Base', items: ['Socks'] },
            { name: 'Trip', items: ['~base'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks']);
    });
});

describe('negative references', () => {
    it('expands to removals that strip matching items from the union', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base'] },
            { name: 'Skip', items: ['-~Base'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip', 'Skip']), []);
    });

    it('removes only items from the referenced list', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base', 'Passport'] },
            { name: 'Skip', items: ['-~Base'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip', 'Skip']), ['Passport']);
    });

    it('treats -~List? as a negative ref (optional marking does not apply)', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Keep', items: ['Socks', 'Passport'] },
            { name: 'Skip', items: ['-~Base?'] },
        ];
        // Looks up Base (strips trailing ?), expands, prefixes with -
        assert.deepEqual(combineChecklists(activities, ['Keep', 'Skip']), ['Passport']);
    });
});

describe('optional references', () => {
    it('marks all expanded items as optional', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base?'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks?', 'Hat?']);
    });

    it('does not double-append ? to already-optional items', () => {
        const activities = [
            { name: 'Base', items: ['Socks?', 'Hat'] },
            { name: 'Trip', items: ['~Base?'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks?', 'Hat?']);
    });

    it('demotes optional-ref items when a required duplicate is also present', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base?', 'Socks'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Hat?', 'Socks']);
    });
});

describe('optional demotion', () => {
    it('drops optional item when required counterpart exists', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'Socks?'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks']);
    });

    it('demotes case-insensitively', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'socks?'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks']);
    });

    it('keeps optional item when no required counterpart exists', () => {
        const activities = [{ name: 'Pack', items: ['Socks?'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks?']);
    });
});

describe('removals', () => {
    it('removes matching required items', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'Hat', '-Socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Hat']);
    });

    it('removes matching optional items', () => {
        const activities = [{ name: 'Pack', items: ['Socks?', 'Hat', '-Socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Hat']);
    });

    it('never includes removal directives in output', () => {
        const activities = [{ name: 'Pack', items: ['-Socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), []);
    });

    it('matches removals case-insensitively', () => {
        const activities = [{ name: 'Pack', items: ['Socks', '-socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), []);
    });
});

describe('removal prevention', () => {
    it('keeps A!! when -A is present and strips !! from output', () => {
        const activities = [{ name: 'Pack', items: ['Socks!!', '-Socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks']);
    });
});

describe('cross-cases', () => {
    it('unions selected lists then applies the pipeline', () => {
        const activities = [
            { name: 'A', items: ['Socks'] },
            { name: 'B', items: ['Hat'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['A', 'B']), ['Socks', 'Hat']);
    });

    it('lets a negative ref remove items introduced via a positive ref', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Trip', items: ['~Base', '-~Base'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), []);
    });

    it('demotes optional-ref items against required items from another selected list', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat'] },
            { name: 'Optional', items: ['~Base?'] },
            { name: 'Required', items: ['Socks'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Optional', 'Required']), ['Hat?', 'Socks']);
    });

    it('example: positive ref plus direct removal', () => {
        const activities = [
            { name: 'Base', items: ['Socks', 'Hat?'] },
            { name: 'Trip', items: ['~Base', '-Hat'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['Trip']), ['Socks']);
    });
});

describe('dedupe', () => {
    it('collapses exact duplicate lines', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'Socks', 'Hat'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks', 'Hat']);
    });

    it('keeps differently cased duplicates (case-sensitive dedupe)', () => {
        const activities = [{ name: 'Pack', items: ['Socks', 'socks'] }];
        assert.deepEqual(combineChecklists(activities, ['Pack']), ['Socks', 'socks']);
    });
});

describe('cycles', () => {
    it('returns empty list for mutually recursive references', () => {
        const activities = [
            { name: 'A', items: ['~B'] },
            { name: 'B', items: ['~A'] },
        ];
        assert.deepEqual(combineChecklists(activities, ['A']), []);
    });

    it('resolveReferences returns empty list for cycles without throwing', () => {
        const activities = [
            { name: 'A', items: ['~B'] },
            { name: 'B', items: ['~A'] },
        ];
        assert.deepEqual(resolveReferences(['~A'], activities), []);
    });
});
