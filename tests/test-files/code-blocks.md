# Code Blocks Test

## JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
  return { greeting: `Hi ${name}`, timestamp: Date.now() };
}

const result = greet('World');
```

## Python

```python
def fibonacci(n):
    """Generate Fibonacci sequence up to n."""
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b

for num in fibonacci(100):
    print(num, end=' ')
```

## Bash

```bash
#!/bin/bash

# Deploy script
echo "Starting deployment..."
git pull origin main
npm install
npm run build
pm2 restart app
echo "Deployment complete!"
```

## HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Example</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>
```

## Inline Code

This is `inline code` within a paragraph. You can use `const x = 42;` in JavaScript.

## No Language Specified

```
This is a code block without a language specified.
It should still be formatted as a code block.
```
