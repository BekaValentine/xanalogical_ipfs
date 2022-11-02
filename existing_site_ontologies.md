# Existing Site Ontologies

This document records some ontologies for different types of existing sites.

## Bandcamp

- types
  - artist
    - descriptions of various sorts
    - profile picture
  - album
    - descriptions of various sorts
    - album art
    - song list
  - song
    - descriptions of various sorts
    - song art
- relations
  - ARTIST_HAS_ALBUM
  - ARTIST_HAS_SONG

## Rarbg

- types
  - torrent
  - show/movie/imdb-tag
  - tags
  - categories
- relations
  - TORRENT_HAS_IMDB_TAG
  - TORRENT_HAS_TAG
  - TORRENT_HAS_CATEGORY

## ArtStation

- types
  - artist
    - descriptions of various sorts
    - profile picture
  - art piece
    - descriptions of various sorts
    - images with blurbs
  - image
    - descriptions of various sorts
  - comment
- relations
  - ARTIST_HAS_PIECE
  - ARTIST_HAS_IMAGE
  - COMMENT_ON_ARTIST
  - COMMENT_ON_ART_PIECE
  - COMMENT_ON_IMAGE
  - REPLY_TO_COMMENT

## Spotify

- types
  - user
  - song
  - album
  - playlist
