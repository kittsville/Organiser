const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
    parseActivityTitle,
    formatActivityTitle,
    canonicalCategoryNames,
    normalizeActivity,
} = require('./static/categories.js');

describe('parseActivityTitle', () => {
    it('splits a single-word name from its categories', () => {
        assert.deepEqual(parseActivityTitle('Slimelight :Events :London'), {
            name: 'Slimelight',
            categories: ['Events', 'London'],
        });
    });

    it('keeps spaces in the activity name and in category names', () => {
        assert.deepEqual(parseActivityTitle("Kota's Party :Parties :Not London :Train"), {
            name: "Kota's Party",
            categories: ['Parties', 'Not London', 'Train'],
        });
    });

    it('treats every colon as the start of a category', () => {
        assert.deepEqual(parseActivityTitle('Meet at 6:30 :Events'), {
            name: 'Meet at 6',
            categories: ['30', 'Events'],
        });
    });

    it('returns no categories when the title has no colon', () => {
        assert.deepEqual(parseActivityTitle('Evening out'), {
            name: 'Evening out',
            categories: [],
        });
    });

    it('drops empty categories and collapses extra spaces', () => {
        assert.deepEqual(parseActivityTitle('Slimelight : :Not   London:'), {
            name: 'Slimelight',
            categories: ['Not London'],
        });
    });

    it('keeps one category and prefers the spelling with more capitals', () => {
        assert.deepEqual(parseActivityTitle('Museum :events :Events :EVENTS'), {
            name: 'Museum',
            categories: ['EVENTS'],
        });
    });

    it('keeps the first spelling when capital counts tie', () => {
        assert.deepEqual(parseActivityTitle('Museum :aB :Ab'), {
            name: 'Museum',
            categories: ['aB'],
        });
    });
});

describe('formatActivityTitle', () => {
    it('writes categories back onto the title', () => {
        assert.equal(
            formatActivityTitle({
                name: "Kota's Party",
                categories: ['Parties', 'Not London', 'Train'],
            }),
            "Kota's Party :Parties :Not London :Train"
        );
    });

    it('leaves an uncategorised activity name unchanged', () => {
        assert.equal(formatActivityTitle({ name: 'Picnic' }), 'Picnic');
    });
});

describe('canonicalCategoryNames', () => {
    it('uses first-seen order and the spelling with the most capitals', () => {
        const names = canonicalCategoryNames([
            { categories: ['events', 'London'] },
            { categories: ['Trips'] },
            { categories: ['Events', 'london', 'NOT LONDON'] },
            { categories: ['Not London'] },
        ]);
        assert.deepEqual(names, ['Events', 'London', 'Trips', 'NOT LONDON']);
    });
});

describe('normalizeActivity', () => {
    it('moves categories out of a stored title', () => {
        assert.deepEqual(
            normalizeActivity({ name: 'Slimelight :events :London', items: ['Earplugs'] }),
            { name: 'Slimelight', items: ['Earplugs'], categories: ['events', 'London'] }
        );
    });

    it('merges a stored category list with categories still written in the name', () => {
        assert.deepEqual(
            normalizeActivity({
                name: 'Museum :events',
                items: ['Ticket'],
                categories: ['Events', 'london'],
            }),
            { name: 'Museum', items: ['Ticket'], categories: ['Events', 'london'] }
        );
    });

    it('leaves a title that is only categories untouched', () => {
        assert.deepEqual(normalizeActivity({ name: ':Events', items: ['Ticket'] }), {
            name: ':Events',
            items: ['Ticket'],
        });
    });
});
