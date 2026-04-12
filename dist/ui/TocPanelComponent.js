/**
 * MarkUp — TocPanelComponent
 *
 * Slide-in sidebar panel displaying the document's Table of Contents.
 * Extends BaseComponent. Features:
 * - Receives TOC data from TocGenerator
 * - Builds nested <ul><li> structure via DOM helpers (no innerHTML)
 * - Click navigation with smooth scroll to headings
 * - Scroll-spy highlighting via IntersectionObserver
 * - Collapsible sections for nested headings
 * - Slide-in/out transition (left sidebar)
 *
 * @class TocPanelComponent
 * @extends BaseComponent
 */

'use strict';

class TocPanelComponent extends BaseComponent {
  /**
   * Create a TocPanelComponent instance.
   *
   * @param {Object} [options={}] - Configuration options.
   * @param {Object} [options.tocData] - TOC data from TocGenerator.
   * @param {HTMLElement} [options.contentContainer] - The content container for scroll-spy.
   */
  constructor(options = {}) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    super(`${prefix}-toc-panel`);

    /** @private */
    this._prefix = prefix;

    /** @private @type {Object|null} */
    this._tocData = options.tocData || null;

    /** @private @type {HTMLElement|null} */
    this._contentContainer = options.contentContainer || null;

    /** @private @type {IntersectionObserver|null} */
    this._observer = null;

    /** @private @type {string|null} */
    this._activeHeadingId = null;

    /** @private @type {Map<string, HTMLElement>} */
    this._tocLinkElements = new Map();

    // Bound handlers for cleanup
    /** @private */
    this._boundOnCloseClick = this._onCloseClick.bind(this);
    /** @private */
    this._boundOnTocClick = this._onTocClick.bind(this);
  }

  /**
   * Update TOC data and re-render if mounted.
   *
   * @param {Object} tocData - TOC data from TocGenerator.
   */
  setTocData(tocData) {
    this._tocData = tocData;
    if (this._mounted && this._element) {
      const nav = this._element.querySelector(`.${this._prefix}-toc-nav`);
      if (nav) {
        while (nav.firstChild) {
          nav.removeChild(nav.firstChild);
        }
        if (tocData && tocData.tree && tocData.tree.length > 0) {
          nav.appendChild(this._buildTocList(tocData.tree));
        }
      }
      this._setupScrollSpy();
    }
  }

  /**
   * Set the content container for scroll-spy.
   *
   * @param {HTMLElement} container - The content container element.
   */
  setContentContainer(container) {
    this._contentContainer = container;
    if (this._mounted) {
      this._setupScrollSpy();
    }
  }

  /**
   * Mount the TOC panel into a parent element.
   *
   * @param {HTMLElement} parentElement - The DOM element to mount into.
   */
  mount(parentElement) {
    if (this._mounted) {
      return;
    }

    if (!parentElement) {
      console.warn('TocPanelComponent: Cannot mount — parent element is null');
      return;
    }

    // Build the panel DOM
    this._element = this._buildPanel();

    // Start hidden
    this._element.style.display = 'none';
    this._previousDisplay = '';

    parentElement.appendChild(this._element);
    this._mounted = true;

    // Setup scroll-spy if content container is available
    if (this._contentContainer) {
      this._setupScrollSpy();
    }
  }

  /**
   * Unmount the TOC panel. Removes all listeners and DOM.
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    // Disconnect IntersectionObserver
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    // Remove element from DOM
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._tocLinkElements.clear();
    this._element = null;
    this._mounted = false;
  }

  /**
   * Override show to add transition class.
   */
  show() {
    if (this._element) {
      this._element.style.display = '';
      // Trigger reflow for transition
      void this._element.offsetHeight;
      this._element.classList.add(`${this._prefix}-toc-panel-open`);
    }
  }

  /**
   * Override hide to add transition class.
   */
  hide() {
    if (this._element) {
      this._element.classList.remove(`${this._prefix}-toc-panel-open`);
      // Wait for transition to complete before hiding
      const onTransitionEnd = () => {
        if (this._element && !this._element.classList.contains(`${this._prefix}-toc-panel-open`)) {
          this._element.style.display = 'none';
        }
        if (this._element) {
          this._element.removeEventListener('transitionend', onTransitionEnd);
        }
      };
      this._element.addEventListener('transitionend', onTransitionEnd);
      // Fallback: hide after 400ms if transition doesn't fire
      setTimeout(() => {
        if (this._element && !this._element.classList.contains(`${this._prefix}-toc-panel-open`)) {
          this._element.style.display = 'none';
        }
      }, 400);
    }
  }

  /**
   * Override isVisible to check for transition class.
   */
  isVisible() {
    if (!this._element) {
      return false;
    }
    return this._element.classList.contains(`${this._prefix}-toc-panel-open`);
  }

  // --- Private Methods ---

  /**
   * Build the TOC panel DOM structure.
   *
   * @returns {HTMLElement} The panel root element.
   * @private
   */
  _buildPanel() {
    const p = this._prefix;

    // Header
    const title = this._createElement('span', {
      classList: [`${p}-toc-title`],
      textContent: 'Table of Contents',
    });

    const closeBtn = this._createElement('button', {
      classList: [`${p}-toc-close`],
      'aria-label': 'Close table of contents',
      title: 'Close',
      events: { click: this._boundOnCloseClick },
    }, ['×']);

    const header = this._createElement('div', {
      classList: [`${p}-toc-header`],
    }, [title, closeBtn]);

    // Navigation
    const nav = this._createElement('nav', {
      classList: [`${p}-toc-nav`],
      'role': 'navigation',
      'aria-label': 'Table of Contents',
    });

    // Build TOC list if data is available
    if (this._tocData && this._tocData.tree && this._tocData.tree.length > 0) {
      nav.appendChild(this._buildTocList(this._tocData.tree));
    }

    // Panel container
    const panel = this._createElement('div', {
      classList: [`${p}-toc-panel`],
      id: this._id,
      'aria-expanded': 'false',
    }, [header, nav]);

    // Add click delegation for TOC links
    nav.addEventListener('click', this._boundOnTocClick);

    return panel;
  }

  /**
   * Build a nested <ul> list from a TOC tree structure.
   *
   * @param {Object[]} nodes - Tree nodes from TocGenerator.
   * @returns {HTMLElement} A <ul> element containing the TOC.
   * @private
   */
  _buildTocList(nodes) {
    const p = this._prefix;

    const items = nodes.map((node) => {
      const children = [];

      // Create anchor link
      const link = this._createElement('a', {
        href: `#${node.id}`,
        classList: [`${p}-toc-link`],
        textContent: node.text,
        dataset: { level: String(node.level), headingId: node.id },
      });

      // Store link reference for scroll-spy
      this._tocLinkElements.set(node.id, link);
      children.push(link);

      // Build children if present
      if (node.children && node.children.length > 0) {
        const toggleBtn = this._createElement('button', {
          classList: [`${p}-toc-toggle`],
          'aria-label': 'Toggle section',
          'aria-expanded': 'true',
        }, ['▾']);

        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const childList = e.target.parentElement.querySelector(`.${p}-toc-list`);
          if (childList) {
            const isCollapsed = childList.style.display === 'none';
            childList.style.display = isCollapsed ? '' : 'none';
            e.target.textContent = isCollapsed ? '▾' : '▸';
            e.target.setAttribute('aria-expanded', String(isCollapsed));
          }
        });

        children.unshift(toggleBtn);
        children.push(this._buildTocList(node.children));
      }

      return this._createElement('li', {
        classList: [`${p}-toc-item`, `${p}-toc-level-${node.level}`],
      }, children);
    });

    return this._createElement('ul', {
      classList: [`${p}-toc-list`],
    }, items);
  }

  /**
   * Handle click on TOC link — smooth scroll to heading.
   *
   * @param {Event} e - Click event.
   * @private
   */
  _onTocClick(e) {
    const link = e.target.closest(`.${this._prefix}-toc-link`);
    if (!link) {
      return;
    }

    e.preventDefault();
    const headingId = link.dataset.headingId;
    if (headingId) {
      const heading = document.getElementById(headingId);
      if (heading) {
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Update active state
        this._setActiveHeading(headingId);
      }
    }
  }

  /**
   * Handle close button click.
   *
   * @param {Event} e - Click event.
   * @private
   */
  _onCloseClick(e) {
    e.preventDefault();
    this.hide();
  }

  /**
   * Setup IntersectionObserver for scroll-spy.
   *
   * @private
   */
  _setupScrollSpy() {
    // Disconnect existing observer
    if (this._observer) {
      this._observer.disconnect();
    }

    if (!this._contentContainer) {
      return;
    }

    const headings = this._contentContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings.length === 0) {
      return;
    }

    this._observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this._setActiveHeading(entry.target.id);
          }
        }
      },
      {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    );

    for (const heading of headings) {
      if (heading.id) {
        this._observer.observe(heading);
      }
    }
  }

  /**
   * Set the active heading in the TOC, highlighting its link.
   *
   * @param {string} headingId - The ID of the active heading.
   * @private
   */
  _setActiveHeading(headingId) {
    if (this._activeHeadingId === headingId) {
      return;
    }

    const p = this._prefix;

    // Remove active class from previous
    if (this._activeHeadingId) {
      const prevLink = this._tocLinkElements.get(this._activeHeadingId);
      if (prevLink) {
        prevLink.classList.remove(`${p}-toc-link-active`);
      }
    }

    // Add active class to current
    const currentLink = this._tocLinkElements.get(headingId);
    if (currentLink) {
      currentLink.classList.add(`${p}-toc-link-active`);
      // Scroll the TOC nav to keep active item visible
      const nav = this._element ? this._element.querySelector(`.${p}-toc-nav`) : null;
      if (nav) {
        const linkRect = currentLink.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        if (linkRect.top < navRect.top || linkRect.bottom > navRect.bottom) {
          currentLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    }

    this._activeHeadingId = headingId;
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_TOC_PANEL_COMPONENT = TocPanelComponent;
}
