const collapseWhitespace = (value) => value.trim().replace(/\s+/g, ' ');

const categoryKey = (category) => collapseWhitespace(category).toLocaleLowerCase();

const capitalCount = (value) => {
    const capitals = value.match(/\p{Lu}/gu);
    return capitals ? capitals.length : 0;
};

const preferCategoryName = (current, candidate) => {
    if (capitalCount(candidate) > capitalCount(current)) {
        return candidate;
    }
    return current;
};

const addCategory = (categories, seen, rawCategory) => {
    const category = collapseWhitespace(rawCategory);
    if (!category) {
        return;
    }

    const key = category.toLocaleLowerCase();
    if (!seen.has(key)) {
        seen.set(key, categories.length);
        categories.push(category);
        return;
    }

    const index = seen.get(key);
    categories[index] = preferCategoryName(categories[index], category);
};

const parseActivityTitle = (title) => {
    const parts = String(title).split(':');
    const categories = [];
    const seen = new Map();
    parts.slice(1).forEach(part => addCategory(categories, seen, part));
    return {
        name: parts[0].trim(),
        categories,
    };
};

const mergeCategories = (current, incoming) => {
    const categories = [];
    const seen = new Map();
    [...current, ...incoming].forEach(category => addCategory(categories, seen, category));
    return categories;
};

const formatActivityTitle = (activity) => {
    const categories = activity.categories || [];
    if (categories.length === 0) {
        return activity.name;
    }
    return `${activity.name} :${categories.join(' :')}`;
};

const canonicalCategoryNames = (activities) => {
    const order = [];
    const best = new Map();

    activities.forEach(activity => {
        (activity.categories || []).forEach(category => {
            const key = categoryKey(category);
            if (!best.has(key)) {
                order.push(key);
                best.set(key, category);
                return;
            }
            best.set(key, preferCategoryName(best.get(key), category));
        });
    });

    return order.map(key => best.get(key));
};

const normalizeActivity = (activity) => {
    const parsed = parseActivityTitle(activity.name || '');
    if (!parsed.name) {
        return { ...activity };
    }

    const categories = mergeCategories(parsed.categories, activity.categories || []);
    const normalized = {
        ...activity,
        name: parsed.name,
    };

    if (categories.length === 0) {
        delete normalized.categories;
        return normalized;
    }

    normalized.categories = categories;
    return normalized;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        parseActivityTitle,
        formatActivityTitle,
        canonicalCategoryNames,
        normalizeActivity,
        categoryKey,
    };
} else if (typeof window !== 'undefined') {
    window.parseActivityTitle = parseActivityTitle;
    window.formatActivityTitle = formatActivityTitle;
    window.canonicalCategoryNames = canonicalCategoryNames;
    window.normalizeActivity = normalizeActivity;
    window.categoryKey = categoryKey;
}
