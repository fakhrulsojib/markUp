/**
 * MarkUp — TocGenerator
 *
 * Table of Contents builder that walks the DOM for h1-h6 heading elements,
 * extracts heading data, assigns unique IDs, and builds a nested tree
 * structure suitable for rendering as a sidebar TOC.
 *
 * @class TocGenerator
 */

'use strict';

class TocGenerator {
  /**
   * Create a new TocGenerator instance.
   */
  constructor() {
    /**
     * Flat list of extracted headings.
     * Each entry: { level: number, text: string, id: string }
     * @type {Object[]}
     * @private
     */
    this._headings = [];

    /**
     * Nested tree structure built from the flat heading list.
     * @type {Object[]}
     * @private
     */
    this._tree = [];

    /**
     * Tracks slug counts for deduplication of heading IDs.
     * @type {Map<string, number>}
     * @private
     */
    this._slugCounts = new Map();
  }

  /**
   * Generate TOC data from a DOM container.
   * Walks the container for h1-h6 elements, extracts text and level,
   * assigns unique IDs to headings that don't have one, and builds
   * a nested tree structure.
   *
   * @param {HTMLElement} container - The DOM container to scan for headings.
   * @returns {Object[]} Flat array of heading objects: [{ level, text, id }].
   */
  generate(container) {
    if (!container) {
      return [];
    }

    // Reset state
    this._headings = [];
    this._tree = [];
    this._slugCounts.clear();

    // Find all headings in the container
    const headingElements = container.querySelectorAll('h1, h2, h3, h4, h5, h6');

    for (const heading of headingElements) {
      const level = parseInt(heading.tagName.charAt(1), 10);
      const text = heading.textContent.trim();

      // Assign unique ID if missing
      if (!heading.id) {
        heading.id = this._generateSlug(text);
      } else {
        // Track existing IDs to avoid collisions
        this._slugCounts.set(heading.id, (this._slugCounts.get(heading.id) || 0) + 1);
      }

      this._headings.push({
        level: level,
        text: text,
        id: heading.id,
      });
    }

    // Build the nested tree from the flat list
    this._tree = this._buildTree(this._headings);

    return this._headings;
  }

  /**
   * Build a nested tree structure from a flat list of headings.
   * Each node: { level, text, id, children: [] }.
   *
   * @param {Object[]} headings - Flat array of heading objects.
   * @returns {Object[]} Nested tree structure.
   * @private
   */
  _buildTree(headings) {
    if (!headings || headings.length === 0) {
      return [];
    }

    const root = { children: [] };
    const stack = [{ node: root, level: 0 }];

    for (const heading of headings) {
      const treeNode = {
        level: heading.level,
        text: heading.text,
        id: heading.id,
        children: [],
      };

      // Find the appropriate parent — pop stack until we find a node
      // with a level lower than the current heading
      while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
        stack.pop();
      }

      // Add as child of the current top-of-stack
      stack[stack.length - 1].node.children.push(treeNode);
      stack.push({ node: treeNode, level: heading.level });
    }

    return root.children;
  }

  /**
   * Generate an HTML string representing the TOC as nested <ul><li> lists.
   * Uses DOM helpers to build the structure safely (no innerHTML).
   *
   * @returns {string} HTML string of the TOC, or empty string if no headings.
   */
  toHtml() {
    if (this._tree.length === 0) {
      return '';
    }

    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    if (helpers) {
      // Build using DOM helpers — convert to HTML string via temporary container
      const ul = this._buildListElement(this._tree, helpers);
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(ul);
      return tempDiv.innerHTML;
    } else {
      // Fallback: build HTML string via DOM (still no inline HTML construction)
      return this._buildHtmlString(this._tree);
    }
  }

  /**
   * Build a <ul> element from a tree of heading nodes using DOM helpers.
   *
   * @param {Object[]} nodes - Tree nodes to render.
   * @param {Object} helpers - DOM helpers reference.
   * @returns {HTMLElement} A <ul> element containing the TOC.
   * @private
   */
  _buildListElement(nodes, helpers) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    const listItems = nodes.map((node) => {
      const children = [];

      // Create the anchor link
      const anchor = helpers.createElement('a', {
        href: `#${node.id}`,
        textContent: node.text,
        classList: [`${prefix}-toc-link`],
        dataset: { level: String(node.level) },
      });

      children.push(anchor);

      // Recursively create child lists
      if (node.children && node.children.length > 0) {
        children.push(this._buildListElement(node.children, helpers));
      }

      return helpers.createElement('li', {
        classList: [`${prefix}-toc-item`, `${prefix}-toc-level-${node.level}`],
      }, children);
    });

    return helpers.createElement('ul', {
      classList: [`${prefix}-toc-list`],
    }, listItems);
  }

  /**
   * Fallback method to build TOC HTML string via DOM (without DOM helpers).
   *
   * @param {Object[]} nodes - Tree nodes to render.
   * @returns {string} HTML string.
   * @private
   */
  _buildHtmlString(nodes) {
    const ul = document.createElement('ul');
    ul.className = 'markup-toc-list';

    for (const node of nodes) {
      const li = document.createElement('li');
      li.className = `markup-toc-item markup-toc-level-${node.level}`;

      const a = document.createElement('a');
      a.href = `#${node.id}`;
      a.textContent = node.text;
      a.className = 'markup-toc-link';
      a.dataset.level = String(node.level);

      li.appendChild(a);

      if (node.children && node.children.length > 0) {
        const childHtml = this._buildHtmlString(node.children);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = childHtml;
        if (tempDiv.firstChild) {
          li.appendChild(tempDiv.firstChild);
        }
      }

      ul.appendChild(li);
    }

    const wrapper = document.createElement('div');
    wrapper.appendChild(ul);
    return wrapper.innerHTML;
  }

  /**
   * Generate a URL-safe slug from a heading text string.
   * Handles duplicates by appending a numeric suffix.
   *
   * @param {string} text - The heading text to slugify.
   * @returns {string} A unique URL-safe slug.
   * @private
   */
  _generateSlug(text) {
    // Convert to lowercase, replace non-word chars with hyphens, collapse hyphens
    let slug = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')   // Remove non-word chars (except spaces and hyphens)
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/-+/g, '-')        // Collapse consecutive hyphens
      .replace(/^-+|-+$/g, '');   // Trim leading/trailing hyphens

    if (!slug) {
      slug = 'heading';
    }

    // Handle duplicates by appending a suffix
    const count = this._slugCounts.get(slug) || 0;
    this._slugCounts.set(slug, count + 1);

    if (count > 0) {
      slug = `${slug}-${count}`;
    }

    return slug;
  }

  /**
   * Get the flat list of headings from the last generate() call.
   *
   * @returns {Object[]} Array of heading objects: [{ level, text, id }].
   */
  getHeadings() {
    return [...this._headings];
  }

  /**
   * Get the nested tree structure from the last generate() call.
   *
   * @returns {Object[]} Nested tree nodes.
   */
  getTree() {
    return this._tree;
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_TOC_GENERATOR = TocGenerator;
}
