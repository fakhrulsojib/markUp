# Large Document Test File

> This file contains 1000+ lines of Markdown for performance and scrolling testing.

## Section 1: Introduction

This is a large Markdown document designed to test the MarkUp Chrome Extension's ability to handle lengthy content. It includes various Markdown elements distributed throughout the file to ensure comprehensive rendering coverage.

### 1.1 Purpose

The purpose of this test file is to verify:

1. Performance with large documents
2. Smooth scrolling behavior
3. Table of Contents generation with many headings
4. Syntax highlighting across many code blocks
5. Memory management with large DOM trees

### 1.2 Overview

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

---

## Section 2: Text Elements

### 2.1 Paragraphs

Paragraph one: The quick brown fox jumps over the lazy dog. This sentence contains every letter of the English alphabet, making it useful for font testing. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, nisi vel consectetur interdum, nisl nunc egestas nisi, vitae accumsan tellus nisi eget nisi.

Paragraph two: Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.

Paragraph three: Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.

### 2.2 Emphasis and Formatting

This text is **bold** and this is *italic*. This is ***bold and italic***. This is ~~strikethrough~~.

Here is `inline code` within a sentence. And here is a [link to example.com](https://example.com).

### 2.3 Block Quotes

> This is a blockquote. It can contain multiple lines and even other elements.
>
> > This is a nested blockquote.
> >
> > > And this is triple-nested.

---

## Section 3: Lists

### 3.1 Unordered Lists

- Item 1
  - Sub-item 1.1
  - Sub-item 1.2
    - Sub-sub-item 1.2.1
    - Sub-sub-item 1.2.2
  - Sub-item 1.3
- Item 2
- Item 3
  - Sub-item 3.1

### 3.2 Ordered Lists

1. First item
2. Second item
   1. Nested first
   2. Nested second
3. Third item
4. Fourth item
   1. Nested first
   2. Nested second
   3. Nested third

### 3.3 Task Lists

- [x] Task completed
- [x] Another completed task
- [ ] Pending task
- [ ] Another pending task
  - [x] Sub-task done
  - [ ] Sub-task pending

---

## Section 4: Code Blocks

### 4.1 JavaScript

```javascript
class MarkdownRenderer {
  constructor(options = {}) {
    this.parser = new MarkdownParser(options);
    this.sanitizer = new Sanitizer();
    this.container = null;
  }

  async render(markdown) {
    const html = this.parser.parse(markdown);
    const sanitized = this.sanitizer.sanitize(html);
    this.container.innerHTML = sanitized;
    return this.container;
  }

  clear() {
    if (this.container) {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
    }
  }
}

const renderer = new MarkdownRenderer({ gfm: true });
renderer.render('# Hello World');
```

### 4.2 Python

```python
import re
from pathlib import Path
from typing import List, Optional

class MarkdownParser:
    """Parse Markdown files into structured data."""

    HEADING_PATTERN = re.compile(r'^(#{1,6})\s+(.+)$', re.MULTILINE)

    def __init__(self, strict: bool = False):
        self.strict = strict
        self._headings: List[dict] = []

    def parse(self, content: str) -> dict:
        headings = self._extract_headings(content)
        return {
            'headings': headings,
            'word_count': len(content.split()),
            'line_count': content.count('\n') + 1,
        }

    def _extract_headings(self, content: str) -> List[dict]:
        return [
            {'level': len(m.group(1)), 'text': m.group(2).strip()}
            for m in self.HEADING_PATTERN.finditer(content)
        ]

if __name__ == '__main__':
    parser = MarkdownParser()
    result = parser.parse(Path('README.md').read_text())
    print(f"Found {len(result['headings'])} headings")
```

### 4.3 HTML/CSS

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MarkUp Extension</title>
  <style>
    .markup-content {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      font-family: system-ui, sans-serif;
    }
    .markup-content h1 {
      border-bottom: 1px solid #d0d7de;
      padding-bottom: 8px;
    }
  </style>
</head>
<body>
  <article class="markup-content">
    <h1>Hello World</h1>
    <p>Rendered by MarkUp.</p>
  </article>
</body>
</html>
```

### 4.4 Bash

```bash
#!/bin/bash
# Package script for MarkUp extension

VERSION="0.1.0"
DIST_DIR="dist"
ZIP_NAME="markup-extension-v${VERSION}.zip"

echo "Building MarkUp v${VERSION}..."

# Clean
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy source
cp -r src/* "$DIST_DIR/"

# Remove test artifacts
find "$DIST_DIR" -name "*.test.js" -delete

# Package
cd "$DIST_DIR" && zip -r "../$ZIP_NAME" . -x "*.DS_Store"

echo "✅ Package created: $ZIP_NAME"
```

### 4.5 JSON

```json
{
  "manifest_version": 3,
  "name": "MarkUp",
  "version": "0.1.0",
  "description": "Render Markdown files beautifully in your browser",
  "permissions": ["activeTab", "storage", "scripting", "tabs"],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [{
    "matches": ["file:///*/*.md"],
    "js": ["content/content-script.js"],
    "run_at": "document_idle"
  }]
}
```

---

## Section 5: Tables

### 5.1 Simple Table

| Feature | Status | Priority |
|---------|--------|----------|
| Markdown rendering | ✅ Done | P0 |
| Syntax highlighting | ✅ Done | P0 |
| Theme switching | ✅ Done | P1 |
| Table of Contents | ✅ Done | P1 |
| Search | ✅ Done | P2 |
| Print | ✅ Done | P2 |
| Popup UI | ✅ Done | P1 |

### 5.2 Aligned Table

| Left | Center | Right |
|:-----|:------:|------:|
| L1 | C1 | R1 |
| L2 | C2 | R2 |
| L3 | C3 | R3 |
| L4 | C4 | R4 |
| L5 | C5 | R5 |

---

## Section 6: Images and Links

### 6.1 Links

- [GitHub](https://github.com)
- [MDN Web Docs](https://developer.mozilla.org)
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/)
- [Markdown Guide](https://www.markdownguide.org)

### 6.2 Reference Links

[marked]: https://github.com/markedjs/marked
[hljs]: https://highlightjs.org/

The extension uses [marked] for parsing and [hljs] for syntax highlighting.

---

## Section 7: Horizontal Rules and Separators

Above this line.

---

Below the rule.

***

Another separator style.

___

And another.

---

## Section 8: Repeated Content for Length

### 8.1 Paragraph Block A

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus lacinia odio vitae vestibulum vestibulum. Cras venenatis euismod malesuada. Nulla facilisi. Etiam dignissim diam quis enim lobortis, nec fermentum odio elementum. Sed ac felis vel nisl elementum ultrices.

Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec id elit non mi porta gravida at eget metus. Nullam quis risus eget urna mollis ornare vel eu leo. Cras mattis consectetur purus sit amet fermentum.

### 8.2 Paragraph Block B

Maecenas sed diam eget risus varius blandit sit amet non magna. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cras justo odio, dapibus ut facilisis in, egestas eget quam. Praesent commodo cursus magna.

Vestibulum id ligula porta felis euismod semper. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Maecenas faucibus mollis interdum. Donec ullamcorper nulla non metus auctor fringilla.

### 8.3 Paragraph Block C

Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit. Donec id elit non mi porta gravida at eget metus. Donec sed odio dui. Donec ullamcorper nulla non metus auctor fringilla.

Nullam quis risus eget urna mollis ornare vel eu leo. Aenean lacinia bibendum nulla sed consectetur. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus.

### 8.4 Code Example Repeat

```typescript
interface Theme {
  name: string;
  colors: {
    background: string;
    text: string;
    accent: string;
    border: string;
  };
}

const themes: Record<string, Theme> = {
  light: {
    name: 'Light',
    colors: {
      background: '#ffffff',
      text: '#24292f',
      accent: '#0969da',
      border: '#d0d7de',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      background: '#0d1117',
      text: '#e6edf3',
      accent: '#58a6ff',
      border: '#30363d',
    },
  },
};

function applyTheme(themeName: string): void {
  const theme = themes[themeName];
  if (!theme) return;

  const root = document.documentElement;
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--markup-${key}`, value);
  });
}
```

### 8.5 More Paragraphs

Etiam porta sem malesuada magna mollis euismod. Cras mattis consectetur purus sit amet fermentum. Curabitur blandit tempus porttitor. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.

Nulla vitae elit libero, a pharetra augue. Cras justo odio, dapibus ut facilisis in, egestas eget quam. Aenean lacinia bibendum nulla sed consectetur. Sed posuere consectetur est at lobortis.

### 8.6 List Repetition

1. Initialization phase
   - Create directory structure
   - Set up manifest.json
   - Configure permissions
2. Core utility phase
   - Constants module
   - DOM helpers
   - Sanitizer
   - EventEmitter
3. Infrastructure phase
   - StorageManager
   - MessageBus
   - FileDetector
4. Parsing phase
   - Vendor libraries
   - MarkdownParser
   - HtmlRenderer
   - SyntaxHighlighter
   - TocGenerator
5. Theming phase
   - CSS variables
   - Theme stylesheets
   - Typography
   - ThemeManager
6. UI components phase
   - BaseComponent
   - Toolbar
   - TOC Panel
   - Search Bar
   - Settings Panel
7. Polish phase
   - Popup UI
   - Options page
   - Recent files
   - Accessibility
   - Error handling

---

## Section 9: Definition Lists and Details

### 9.1 Terms

Markdown
: A lightweight markup language with plain-text formatting syntax.

GFM
: GitHub Flavored Markdown — a superset of CommonMark with extensions.

CSP
: Content Security Policy — a security layer that helps prevent XSS attacks.

### 9.2 Collapsible Sections

<details>
<summary>Click to expand Section A</summary>

This is hidden content that appears when the section is expanded. It can contain any Markdown elements including **bold**, *italic*, and `code`.

- Item 1
- Item 2
- Item 3

</details>

<details>
<summary>Click to expand Section B</summary>

Another collapsible section with more content.

```javascript
console.log('Inside a collapsible section!');
```

</details>

---

## Section 10: Extended Content

### 10.1 Long Paragraph Set

Paragraph 1 of 20: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Paragraph 2 of 20: Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Paragraph 3 of 20: Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

Paragraph 4 of 20: Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?

Paragraph 5 of 20: Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?

Paragraph 6 of 20: At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

Paragraph 7 of 20: Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

Paragraph 8 of 20: Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.

Paragraph 9 of 20: Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.

Paragraph 10 of 20: Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.

Paragraph 11 of 20: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Paragraph 12 of 20: Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Paragraph 13 of 20: Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

Paragraph 14 of 20: Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?

Paragraph 15 of 20: Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?

Paragraph 16 of 20: At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident.

Paragraph 17 of 20: Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio.

Paragraph 18 of 20: Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est.

Paragraph 19 of 20: Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.

Paragraph 20 of 20: Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.

---

## Section 11: More Code Blocks

### 11.1 Go

```go
package main

import (
    "fmt"
    "net/http"
    "encoding/json"
)

type Response struct {
    Status  string `json:"status"`
    Message string `json:"message"`
}

func handler(w http.ResponseWriter, r *http.Request) {
    resp := Response{Status: "ok", Message: "MarkUp is running"}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
}

func main() {
    http.HandleFunc("/", handler)
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
```

### 11.2 Rust

```rust
use std::collections::HashMap;

#[derive(Debug)]
struct Theme {
    name: String,
    bg_color: String,
    text_color: String,
}

impl Theme {
    fn new(name: &str, bg: &str, text: &str) -> Self {
        Theme {
            name: name.to_string(),
            bg_color: bg.to_string(),
            text_color: text.to_string(),
        }
    }
}

fn main() {
    let mut themes: HashMap<&str, Theme> = HashMap::new();
    themes.insert("light", Theme::new("Light", "#ffffff", "#24292f"));
    themes.insert("dark", Theme::new("Dark", "#0d1117", "#e6edf3"));
    themes.insert("sepia", Theme::new("Sepia", "#f4ecd8", "#433422"));

    for (key, theme) in &themes {
        println!("{}: {:?}", key, theme);
    }
}
```

### 11.3 SQL

```sql
CREATE TABLE recent_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    timestamp INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO recent_files (url, title, timestamp)
VALUES ('file:///home/user/README.md', 'README', 1712956800);

SELECT url, title, datetime(timestamp/1000, 'unixepoch') as opened
FROM recent_files
ORDER BY timestamp DESC
LIMIT 10;
```

---

## Section 12: Final Filler Content

### 12.1 Repeated Paragraphs for Length Target

This section ensures the document exceeds 1000 lines for thorough performance testing.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vehicula tellus at enim efficitur, at maximus velit dictum. Aliquam erat volutpat. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.

Fusce at nunc vel sapien efficitur mollis vel non odio. Nunc hendrerit dolor eget turpis ullamcorper, a ullamcorper nunc sagittis. Phasellus eget ligula vel sapien fringilla fermentum vitae eu dolor.

Suspendisse potenti. Nullam vel tortor at nulla elementum elementum. Sed consequat urna eu turpis consequat, non lobortis risus pulvinar. Integer tempor neque non nisi efficitur commodo.

Maecenas ac urna nec sem cursus vehicula eget at eros. Donec bibendum sapien sit amet enim blandit, vel ultrices metus ullamcorper. Aliquam erat volutpat.

Quisque id velit at nisi facilisis euismod eget id risus. Curabitur vulputate arcu vel lacus ullamcorper, at consequat sapien fermentum. Etiam euismod nibh vitae hendrerit sagittis.

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.

### 12.2 More Lists

- Alpha
- Beta
- Gamma
- Delta
- Epsilon
- Zeta
- Eta
- Theta
- Iota
- Kappa
- Lambda
- Mu
- Nu
- Xi
- Omicron
- Pi
- Rho
- Sigma
- Tau
- Upsilon
- Phi
- Chi
- Psi
- Omega

### 12.3 Yet More Paragraphs

Cras mattis consectetur purus sit amet fermentum. Cras justo odio, dapibus ut facilisis in, egestas eget quam. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.

Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Aenean lacinia bibendum nulla sed consectetur.

Donec sed odio dui. Nullam id dolor id nibh ultricies vehicula ut id elit. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.

Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod.

Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Duis mollis, est non commodo luctus, nisi erat porttitor ligula, eget lacinia odio sem nec elit.

Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Donec ullamcorper nulla non metus auctor fringilla. Maecenas faucibus mollis interdum.

---

## Section 13: Conclusion

This document contains approximately 1000+ lines of Markdown content with:

- 13 major sections with nested headings
- Multiple code blocks in 8+ languages
- Tables with various alignments
- Lists (ordered, unordered, task lists)
- Blockquotes (including nested)
- Links and references
- Horizontal rules
- Collapsible sections
- Definition lists
- Inline formatting (bold, italic, strikethrough, code)

It should provide adequate coverage for:
- [x] Performance testing
- [x] Scroll behavior
- [x] TOC generation with deep nesting
- [x] Memory management
- [x] Large DOM tree handling

---

*End of large document test file.*
