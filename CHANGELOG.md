# Changelog

All notable changes to AIGC Gallery are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the same text is used for the GitHub Release body of each version.

## [3.1.0] - released

### Added

- Startup update check: the app asks GitHub `releases/latest` once per launch (cached for 6 hours), shows an amber dot on the About button when a newer release exists, and links to the release page with backup and same-path reminders. The check is the app's only outbound request; it sends no library data and can be turned off under About → Settings.
- Custom artist style categories: pick "Custom…" in the artist form to type any category. Built-in categories stay translated; typed built-in names in either language fold back to the built-in value. The toolbar filter lists built-ins first and custom values after.
- `CHANGELOG.md` (this file), previously a dead link in both READMEs.

### Changed

- The toolbox is driven by a single registry (`tools.ts`): sidebar, page title, `?tool=` whitelist and rendered component all derive from it, sidebar switches update the URL, and unknown `?tool=` values are normalized.
- README quick start now recommends deploying to Vercel or any static server, with local file opening as the alternative.
- Store writes avoid redundant full-row reads and per-row locking: folder moves, page reorders, orphan healing and the dimension backfill use batched `bulkUpdate`; artist add/import no longer reload the whole table; imports run inside one transaction.

### Removed

- The "Image to Prompt" placeholder tool. Local inference would need hundreds of megabytes of models or a Python sidecar, neither of which fits a single-file, backend-free app.

## [3.0.0] - 2026-09-08

### Added

- Full folder backups for both libraries, including images, thumbnails, groups, tags, favorites, artist ratings, saved edits, and settings.
- Verified backup restoration to an empty library, with progress, cancellation, and separate settings retries. Available in supported desktop Chrome / Edge environments.
- Storage usage and quota display, persistent storage requests, and explicit approval, denial, and error feedback.
- Metadata Inspector with raw entries, parsed fields, and reading diagnostics, including ComfyUI support.
- Library-wide metadata checks and selective completion of missing metadata while preserving existing prompts, tags, favorites, and folders.
- Clickable tag filters in the library sidebar and image details.

### Improved

- Redesigned the Metadata Editor as a three-column workbench with per-field undo, change tracking, and extra parameter editing.
- Keep editing sessions when switching tools or pages, with unsaved-change warnings before leaving or refreshing the app.
- Preserve original SD parameter order, field names, extra fields, and NovelAI metadata during PNG export.
- Expand long metadata values, group additional parameters, and automatically resize editor fields.
- Read compressed PNG text chunks and retain additional NovelAI fields and ComfyUI custom-node information.
- Refreshed typography, panels, and animations; added a new app icon and a favicon that follows the accent color.
- Reorganized About into Settings, Storage & backup, and Author tabs.
- Made automatic prompt-to-tag extraction optional and disabled it by default.
- Split Chinese and English documentation and clarified browser compatibility.

### Fixed

- Garbled Chinese PNG prompts and Unicode EXIF comments in JPEG, WebP, and AVIF images.
- Metadata detection for images with missing or incorrect MIME types, malformed PNG chunks, and additional text alongside NovelAI stealth metadata.
- Lost SD parameters with empty prompts or quoted commas, and editor traces leaking into prompts after repeated exports.
- NovelAI v4 character prompt write-back, including negative prompts, and incorrect rounding of character positions.
- Decimal parameter inputs changing values while typing and stale parameter drafts when switching images.
- Library save failures involving nested metadata, with consistent state after failed writes and coordinated writes across tabs during backup and restore.
- Blank pages after leaving the toolbox, incorrect tool navigation, and image previews breaking after route changes.
- Folder and artist-group creation dialogs closing unexpectedly on mobile.
- Incorrect success feedback when artist JSON export fails.

### Removed

- Unimplemented SD-to-NAI and NAI-to-SD converter entries from the toolbox.

## [2.0.0] - 2026-07-18

AIGC-Gallery v2.0.0 update
## 🐛 Bug Fix & Improvements
- Refactored UI components; added SidePanel, SidebarItem, MasonryGrid, SectionLabel, ColorSwatchPicker, EmptyState, StarRating and more; improved ImageLightbox
- Introduced accent color support and vendor fonts; redesigned theme tokens in index.css
- Improved the metadata editor, parser thumbnails (now returns dimensions), and metadata editing helper utilities
- Implemented batched image mutations and persisted view mode
- Removed legacy scripts/assets and streamlined multiple component implementations
- Redesigned SVG theme icons
- Added i18n multi-language support, along with minor accessibility and performance optimizations

## [1.3.2] - 2026-06-20

AIGC-Gallery v1.3.2 update
🐛 修复 (v1.3.2)
[-] 修复了部分DOM元素没有受“模糊效果”功能开关影响的问题
[-] 优化了导出数据默认只导出收藏内容的问题
[-] 优化了数据导入的算法

## [1.3.0] - 2026-05-28

AIGC-Gallery v1.3.0 update

New Features:
[+] Artist Gallery now supports custom "Groups (Tabs)" — manage NAI / Anima / SD prompt syntaxes in separate groups
[+] Horizontal tab bar on top with customizable group name, color dot, live count, and horizontal scrolling
[+] Group operations: create / rename / recolor / reorder left-right / delete (artists in a deleted group are automatically merged into the first remaining group)
[+] Artist add/edit panel now has a "Group" selector — move any artist across groups with one click
[+] Import / Export protocol upgraded to v3: exports carry group metadata, imports auto-merge same-name groups and create new ones as needed
[+] Automatic database migration: on upgrade, all existing artists and sample images are preserved and folded into a "Default" group — zero data loss for existing users
[+] Selected group is persisted via localStorage and restored on next visit
[+] Toolbar and tab bar are sticky on long-list scroll, keeping controls always within reach
[+] Press ESC to quickly close the artist edit panel and image detail panel
[+] Global respect for system prefers-reduced-motion preference

Improvements:
[-] Favorite heart icon color unified to rose-500 across artist cards, image cards, image detail panel, and toolbar; hover / active states now consistent
[-] Backdrop opacity of artist edit panel and image detail panel deepened for clearer layering and contrast in dark mode
[-] Removed hover translate-up on artist cards to eliminate chain-reaction jitter in dense grids; kept shadow lift and image scale feedback
[-] Redesigned empty state for artist list: more semantic palette icon, dashed border container, and an inline "Add your first artist" primary button
[-] Added cursor-pointer to all interactive elements (tabs, selects, buttons, cards) for clearer affordance
[-] Tweaked toolbar layout: search + category + favorites + more + add buttons grouped more compactly
[-] Hidden native horizontal scrollbar on the tab strip while preserving wheel / touch scroll, plus new left/right scroll indicator buttons

Bug Fixes:
[-] Fixed artist card tooltip showing raw keys instead of "Copy prompt / Copied" (missing common.copied and artist.copyPrompt translations)
[-] Fixed search bar default placeholder being hardcoded Chinese "搜索...", which did not localize when switching to English
[-] Fixed artist list empty state text being hardcoded Chinese and not localized in English UI
[-] Fixed artist list empty state icon using a human-avatar SVG that did not match the "No artists" semantics

## [1.2.1] - 2026-03-31

## v1.2.1 - 2026-03-31

### New Features / 新功能

- **自定义画师前缀（画师串画廊）**：在添加画师时支持自定义的画师前缀，自动将偏好前缀填入。默认为“artist:”。
- **Custom Artist Prefix (Artist Gallery)**: When adding an artist, it supports a custom artist prefix and automatically fills in the preferred prefix. The default is 'artist:'.

## [1.2.0] - 2026-03-19

## v1.2.0 - 2026-03-20

### New Features / 新功能

- **设置面板（分页式 About 弹窗）**：导航栏「关于」弹窗重构为双分页 —— **功能设置** 和 **关于作者**，设置项按作用范围分组显示。
- **Settings Panel (Tabbed About Dialog)**: The "About" dialog now has two tabs — **Settings** and **About Author** — with settings organized by scope.

- **上传图片自动填入文件名**（画师串画廊）：在添加画师时上传示例图片，自动将文件名（不含后缀）填入画师名称栏。默认关闭。
- **Auto-fill Filename on Upload** (Artist Gallery): When adding a new artist and uploading a sample image, the filename (without extension) is auto-filled into the artist name field. Off by default.

- **自动补充画师串前缀**（画师串画廊）：需先启用「自动填入文件名」，启用后在填入画师名称的同时自动在画师串栏填入 `artist:文件名`。默认关闭。
- **Auto-fill Artist Prompt Prefix** (Artist Gallery): Requires "Auto-fill filename" to be enabled. Automatically fills the prompt field with `artist:filename`. Off by default.

### Bug Fixes / 修复

- **开关按钮样式优化**：修复激活态开关按钮与背景色融合的视觉问题，改用 `bg-emerald-500` 高对比色。
- **Toggle button styling**: Fixed activated toggle blending into the background by using a high-contrast `bg-emerald-500` color.

## [1.1.0] - 2026-03-13

## v1.1.0 - 2026-03-14

### New Features / 新功能

- **Blur Effect Toggle**: Added a blur effect toggle in the "About" dialog (enabled by default). Users can enable or disable `backdrop-blur` for the following areas based on their device performance:
  - Detail panel backdrop & sidebar in AIGC Library / Artist Gallery
  - Mobile sidebar in AIGC Library / Toolbox
  - Fullscreen image lightbox overlay
  - Toast notifications
  - Preference is persisted in `localStorage` across sessions

## [1.0.0] - 2026-03-11

The first release version of AIGC-Gallery.
You can download zip file through this release note.
