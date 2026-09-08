<div align="center">
  <img src="docs/images/aigc-gallery-a1.png" alt="AIGC Gallery — 藏画匣" width="200" height="200" />
  <h1>AIGC Gallery</h1>
  <p>Collect AI images, organize artist prompts, and explore how each image was generated.</p>
  <p>
    <img src="https://img.shields.io/badge/Chrome-✓-0078D7?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome">
    <img src="https://img.shields.io/badge/Edge-✓-0078D7?style=flat-square&logo=microsoftedge&logoColor=white" alt="Edge">
    <a href="#browser-compatibility"><img src="https://img.shields.io/badge/Firefox-partial%20support-B45309?style=flat-square&logo=firefox&logoColor=white" alt="Firefox: partial support" title="Complete folder backup and restore are currently unavailable. Click for compatibility details."></a>
    <img src="https://img.shields.io/badge/Group-1046260326-0078D7?style=flat-square&logo=QQ&logoColor=white" alt="QQGroup">
  </p>
  <p><a href="README.md">简体中文</a> · <strong>English</strong></p>
  <p>
    <a href="https://github.com/jsh135790/AIGC-Gallery/releases">Download</a> ·
    <a href="CHANGELOG.md">Changelog</a> ·
    <a href="https://github.com/jsh135790/AIGC-Gallery/issues">Report an issue</a> ·
    <a href="LICENSE">GPL-3.0</a>
  </p>
</div>

AIGC Gallery is a local AI image manager that runs entirely in your browser. No account, backend, or API key is required. Images and library records stay in the current browser's IndexedDB, and settings are saved locally. Image imports, metadata parsing, editing, and backups run on your device without uploading your data to a server.

The production build is a self-contained `index.html` that works offline or on a static website.

## Features

| Feature | What you can do |
| --- | --- |
| AIGC Library | Drag and drop or import multiple images, filter by folder or tag, search, favorite, delete selections, and switch between grid and masonry views |
| Artist Gallery | Organize artist prompts into custom groups, save sample images, categories, tags, favorites, and ratings, copy prompts, and import / export records as JSON |
| Metadata Editor | Edit prompts, negative prompts, generation parameters, and NovelAI v4 character prompts in SD WebUI / NovelAI PNGs; review changes, undo individual edits, export PNGs, or write back to the library |
| Metadata Inspector | Examine raw metadata entries, parsed fields, and reading diagnostics, including ComfyUI; check library metadata and fill missing information on request |
| Storage & backup | View storage usage and protection status, request persistent storage, back up both libraries to a folder, and restore to an empty library |
| Appearance & language | English and Chinese, automatic language detection, light / dark / system themes, custom accent colors, and optional blur effects |

The toolbox's **Image to Prompt** entry is currently a placeholder and is not implemented.

## Getting started

### Download a release

1. Download a release archive from [Releases](https://github.com/jsh135790/AIGC-Gallery/releases) and extract it.
2. Open its `index.html` in a recent desktop version of Chrome or Edge.
3. Import images in **AIGC Library**, or add artist records in **Artist Gallery**.

For complete folder backup and restore, use **HTTPS or localhost** where possible. Availability when opening an HTML file directly depends on the browser; the app shows which features are supported. See the compatibility table below.

**Keep a consistent entry point.** Libraries are isolated by browser, profile, and page origin. Changing the protocol, hostname, port, or browser profile, or moving a local HTML file, can open a different storage area. Your library does not migrate automatically. Create a backup at the original entry point before switching.

### Run from source

Use **Node.js 24 LTS** and npm. Node.js 22.x starting at 22.12 is also supported.

```bash
git clone https://github.com/jsh135790/AIGC-Gallery.git
cd AIGC-Gallery
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The development port is fixed at **5173**. If occupied, the server fails instead of switching ports and opening an empty library that could look like data loss.

```bash
npm run build
```

The build produces `dist/index.html` with scripts and styles inlined into that file.

## Metadata support

| Image / metadata format | Reading and inspection | Editing and export |
| --- | --- | --- |
| SD WebUI PNG | Prompts, negative prompts, generation parameters, and extra fields | Supported; exports SD-format PNGs |
| NovelAI PNG | Standard metadata, v4 character prompts, and character positions | Supported, including each character's positive and negative prompts |
| NovelAI Stealth PNG | Reads metadata hidden in the alpha channel | Writes edits to standard PNG text chunks; the hidden alpha-channel copy is not updated |
| ComfyUI PNG | Workflow and API formats, recognized parameters, and node information | Read-only; no workflow editing or write-back |
| JPEG / WebP / AVIF | EXIF `UserComment`, including SD parameter text when recognized | No write-back; this is not a full EXIF / XMP editor |
| PNG without recognized metadata | Shows the unrecognized state; raw entries can be inspected | Enter metadata and choose SD or NAI format for export |

Container formats are identified from file contents. Custom ComfyUI nodes are included in node information, but their input semantics are not guessed. An image must contain the relevant metadata for its generation parameters to be read.

### Edit image parameters

Upload a PNG in **Toolbox → Metadata Editor**, or open the editor from an image's library details. Export a new PNG after editing, or write back to the current library record when opening a supported image from the library. Neither action overwrites the file you originally selected on disk.

The editor updates fields using the original metadata as its basis and retains unmodified extra information. Exported images include an AIGC Gallery edit timestamp and version record. Switching tools or pages keeps the editing session; export or write back before refreshing or closing the page.

### Inspect and complete metadata

In **Toolbox → Metadata Inspector**, examine raw entries, parsed fields, and diagnostics such as format matching, encoding fallbacks, and unconsumed fields. Entries show both byte lengths and decoded character counts to help identify compression or encoding issues.

**Check library metadata** rereads the original images and compares them with stored records. **The check itself does not modify your library.** If you choose to complete metadata, it fills missing parameters and updates raw metadata and related parsing information. Prompts are reread only for records that have never been successfully parsed; existing prompts, manual tags, favorites, and folder assignments are preserved.

Automatic tag extraction from prompts is **off by default**. For comma-separated tag prompts, enable it in **About → Settings**. It affects subsequent imports only.

## Storage protection and complete backups

Open **About → Storage & backup**.

### Is storage protection enabled?

Look for **Storage protection enabled** in the panel. When user data exists, the app requests persistence automatically at most once per page session. You can also request it manually.

Edge / Chrome usually decide automatically, without necessarily showing a permission prompt. If the request is denied, the panel states that protection is still off and offers **Retry request**. Errors receive a separate message. The app cannot force browser approval, and an empty console does not mean the request succeeded.

Persistent storage prevents automatic eviction under storage pressure. **It does not protect against manually clearing site data and does not replace a backup.** The displayed usage and limit are browser estimates, not your remaining disk space.

### Back up to a folder

Click **Back up to folder** and choose a destination. Each backup creates an independent, dated snapshot directory. Older snapshots remain, and each snapshot requires roughly another full library's worth of disk space.

A complete backup includes:

- Original images, thumbnails, and artist records from both libraries.
- Artist groups, image folders, tags, favorites, artist ratings, and saved edits.
- Saved settings such as language, theme, accent color, and import preferences.

Images retain the bytes and formats stored in the library, without re-encoding or rewriting metadata. The final `index.json` manifest is saved only after all image files have been written and verified with SHA-256. Cancelled or incomplete backups cannot be restored. Keep the whole snapshot directory together.

The Artist Gallery's **JSON export shares records without images** and is not a complete backup. The last backup timestamp is only a local record; it does not confirm that the backup files still exist.

### Restore a backup

1. Open an **empty library** at the destination entry point and close older versions of the app.
2. Click **Select backup** and choose the snapshot subdirectory containing `index.json`.
3. Review the verified summary and click **Restore to empty library**.
4. Reload the app after completion, including other open app tabs.

Restore does not merge or overwrite an existing library. An untouched, automatically created default artist group is allowed. File validation failures prevent import, and database write failures roll back the entire restore. If some settings fail after the library has been restored, retry those settings separately.

## Browser compatibility

| Feature | Desktop Chrome / Edge | Firefox / Safari |
| --- | --- | --- |
| Libraries and metadata tools | Recent stable versions recommended | Requires IndexedDB and support for the image format; availability depends on the browser |
| Storage protection | Granted or denied according to browser policy | Depends on persistent storage API availability and approval |
| Complete folder backup / restore | Requires File System Access, Web Locks, and Web Crypto; HTTPS / localhost recommended | Currently unavailable |

Features are enabled based on runtime capability checks. Private / incognito sessions are unsuitable for long-term library storage. Moving between browsers or profiles requires your own backup and migration.

## Development and contributions

Built with Vue 3, TypeScript, Vite, Pinia, Dexie / IndexedDB, Tailwind CSS v4, shadcn-vue / Reka UI, ExifReader, pako, and PNG chunk utilities.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server on fixed port 5173 |
| `npm run build` | Type-check and build the single HTML file |
| `npm test` | Run all Vitest tests, covering parsing, metadata round trips, storage status, backup / restore, and write coordination |
| `npm run test:watch` | Run tests in watch mode |

For a second development instance, use `npm run dev -- --port 5180`. It has separate storage and does not share the library on port 5173.

[Issues](https://github.com/jsh135790/AIGC-Gallery/issues) and pull requests are welcome. For metadata issues, include the generation tool, browser version, reproduction steps, and a sample image or inspector diagnostics that you can share publicly. Add UI strings in both languages and run tests after parser changes.

## License and acknowledgments

Licensed under [GPL-3.0](LICENSE).

Thanks to [shadcn-vue](https://www.shadcn-vue.com/), [Reka UI](https://reka-ui.com/), [Dexie.js](https://dexie.org/), [ExifReader](https://github.com/mattiasw/ExifReader), and the other open-source projects used here.
