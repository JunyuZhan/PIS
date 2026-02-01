# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Image style presets (13 presets: portrait, landscape, general)
- Admin-controlled batch download with presigned URLs
- Real-time sync via PostgreSQL notifications
- Comprehensive test suite (component tests, E2E tests)
- Security documentation and best practices
- EXIF privacy protection (automatic GPS removal)
- Rate limiting for upload and login APIs
- Password protection for albums
- Mobile-optimized interface
- Dark mode support

### Changed
- Migrated from Supabase to fully self-hosted PostgreSQL
- Improved image processing performance with parallel processing (13-33% faster)
- Enhanced watermarking system (support for up to 6 watermarks)
- Better error handling and logging

### Security
- Automatic EXIF GPS data removal
- Rate limiting on sensitive endpoints
- Secure password handling
- Environment variable validation

## [1.0.0] - 2026-02-01

### Added
- Initial release
- Core photo sharing functionality
- Album management
- Photo upload and processing
- Watermarking support
- Admin dashboard
- Client-facing album pages
- Docker deployment support
- Comprehensive documentation

---

## Version History

- **1.0.0** (2026-02-01): Initial stable release

---

## Release Notes

### Version 1.0.0

This is the initial stable release of PIS (Private Instant Photo Sharing), a self-hosted photo delivery system designed for photographers.

**Key Features:**
- Self-hosted deployment (PostgreSQL + MinIO + Redis)
- Advanced image processing with Sharp
- Watermarking and EXIF protection
- Professional presentation with masonry/grid layouts
- Mobile-optimized interface
- Dark mode support
- Batch download with admin control
- Image style presets

**Documentation:**
- Complete deployment guide (English & Chinese)
- Development guide
- Security best practices
- Testing guide
- Architecture documentation

**License:** MIT License
