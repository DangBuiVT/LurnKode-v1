---
name: accessibility
description: Hướng dẫn implement accessibility (WCAG 2.1) cho DevVerse LMS frontend. Semantic HTML, ARIA labels, keyboard navigation, color contrast.
---

# Accessibility Skill — DevVerse

## Key Principles
- Semantic HTML: dùng `<button>` không phải `<div onclick>`
- ARIA labels cho interactive elements không có visible text
- Keyboard navigation: Tab order logical, focus visible
- Color contrast: >=4.5:1 cho normal text
- Alt text cho tất cả images
- Error messages phải accessible (role="alert")

## Code Editor Accessibility
- Monaco Editor có built-in screen reader support
- Announce submission status changes via `aria-live`

## Testing
- axe-core extension trong browser
- Lighthouse accessibility score >= 90
