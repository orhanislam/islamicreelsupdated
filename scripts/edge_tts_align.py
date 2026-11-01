#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
EdgeTTS Audio & Word-Boundary Timing Generator
Synthesizes speech with Microsoft Edge TTS and outputs audio + millisecond-precise
word boundary timestamps from the native WordBoundary event stream.
"""

import argparse
import asyncio
import json
import os
import sys
import edge_tts

async def synthesize(text_file: str, voice: str, rate: str, pitch: str, mp3_file: str, json_file: str):
    with open(text_file, "r", encoding="utf-8") as f:
        text = f.read().strip()

    if not text:
        raise ValueError("Empty input text")

    comm = edge_tts.Communicate(
        text,
        voice,
        rate=rate,
        pitch=pitch,
        boundary="WordBoundary"
    )

    words = []
    with open(mp3_file, "wb") as f_audio:
        async for chunk in comm.stream():
            chunk_type = chunk.get("type")
            if chunk_type == "audio":
                f_audio.write(chunk["data"])
            elif chunk_type == "WordBoundary":
                # offset and duration in 100-nanosecond units (1e-7 s)
                start = round(chunk["offset"] / 1e7, 3)
                dur = round(chunk["duration"] / 1e7, 3)
                end = round(start + dur, 3)
                raw_word = chunk.get("text", "").strip()
                if raw_word:
                    words.append({
                        "word": raw_word,
                        "start": start,
                        "end": end,
                    })

    with open(json_file, "w", encoding="utf-8") as f_json:
        json.dump(words, f_json, ensure_ascii=False)

    print(f"OK: {len(words)} words, {os.path.getsize(mp3_file)} bytes", flush=True)

def main():
    parser = argparse.ArgumentParser(description="EdgeTTS Word Boundary Generator")
    parser.add_argument("--text-file", required=True, help="Input text file path (UTF-8)")
    parser.add_argument("--voice", default="bg-BG-BorislavNeural", help="Voice identifier")
    parser.add_argument("--rate", default="-5%", help="Speech rate adjustment")
    parser.add_argument("--pitch", default="-2Hz", help="Speech pitch adjustment")
    parser.add_argument("--write-media", required=True, help="Output MP3 file path")
    parser.add_argument("--write-json", required=True, help="Output JSON timestamps path")

    args = parser.parse_args()
    asyncio.run(synthesize(
        args.text_file,
        args.voice,
        args.rate,
        args.pitch,
        args.write_media,
        args.write_json
    ))

if __name__ == "__main__":
    main()
