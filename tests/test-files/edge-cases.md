# Edge Cases Test

## Empty Section

## Heading with `code` in it

## Heading with **bold** and *italic*

## Special Characters: <>&"'

## Duplicate Heading

Some content here.

## Duplicate Heading

Different content here.

## Duplicate Heading

Third instance.

---

## XSS Attempts

This should be sanitized: <script>alert('xss')</script>

This too: <img src="x" onerror="alert('xss')">

And this: [click me](javascript:alert('xss'))

<iframe src="https://evil.com"></iframe>

## Very Long Line

This is a very long line that should wrap properly within the rendered output container without causing horizontal scrolling issues on the page layout and it just keeps going and going and going and going and going and going and going and going and going and going and going.

## Nested Lists

1. First item
   1. Sub-item A
   2. Sub-item B
      - Deep item
      - Another deep item
2. Second item
3. Third item

## Task Lists

- [x] Completed task
- [ ] Pending task
- [x] Another done task
- [ ] Yet to do

## Blockquote

> This is a blockquote.
>
> > This is a nested blockquote.
> >
> > With multiple paragraphs.

## Images

![Alt text for missing image](nonexistent.png)

## Horizontal Rules

---

***

___

## Emphasis Edge Cases

***bold and italic***

**bold with *nested italic* inside**

~~strikethrough text~~
