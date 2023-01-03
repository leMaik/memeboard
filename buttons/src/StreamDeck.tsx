import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@mui/joy";
import type { StreamDeckWeb } from "@elgato-stream-deck/webhid";
import { Clip } from "./Clip";

const drawButton = async (
  deck: StreamDeckWeb,
  keyIndex: number,
  clip: Clip,
  pressed = false
) => {
  const imageSource = `/clips/${clip.id}/thumbnail.jpg`;
  const label = clip.name;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = deck.ICON_SIZE;
  const ctx = canvas.getContext("2d")!;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject();
    image.src = imageSource;
  }).catch(() => null);
  if (img) {
    var scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    var x = canvas.width / 2 - (img.width / 2) * scale;
    var y = canvas.height / 2 - (img.height / 2) * scale;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  } else {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, deck.ICON_SIZE, deck.ICON_SIZE);
  }
  ctx.font = "12px Roboto";
  const measure = ctx.measureText(label.slice(0, 15)).width;
  ctx.fillStyle = "#000a";
  ctx.fillRect(0, deck.ICON_SIZE - 20, deck.ICON_SIZE, 20);
  ctx.fillStyle = "#fff";
  ctx.fillText(
    label.slice(0, 15),
    Math.max(0, (deck.ICON_SIZE - measure) / 2),
    deck.ICON_SIZE - 5,
    deck.ICON_SIZE
  );
  if (pressed) {
    ctx.fillStyle = "#fff3";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  await deck.fillKeyCanvas(keyIndex, canvas);
  canvas.remove();
};

export default function StreamDeckComponent({
  clips,
  onPlayClip,
}: {
  clips: Clip[];
  onPlayClip: (clip: Clip) => void;
}) {
  const playClipRef = useRef<(index: number) => void>();
  useEffect(() => {
    playClipRef.current = (index: number) => onPlayClip(clips[index]);
  }, [clips, onPlayClip]);
  const getClipRef = useRef<(index: number) => Clip>();
  useEffect(() => {
    getClipRef.current = (index: number) => clips[index];
  }, [clips]);

  const [deck, setDeck] = useState<StreamDeckWeb>();
  const handleConnectStreamDeck = useCallback(async () => {
    const { requestStreamDecks } = await import("@elgato-stream-deck/webhid");
    const streamDecks = await requestStreamDecks();
    const deck = streamDecks[0];
    await deck.clearPanel();
    let dimmed = false;
    let dimTimeout = setTimeout(() => {
      deck.setBrightness(0);
      dimmed = true;
    }, 5000);
    deck.setBrightness(50);
    deck.on("down", (keyIndex) => {
      clearTimeout(dimTimeout);
      dimTimeout = setTimeout(() => {
        deck.setBrightness(0);
        dimmed = true;
      }, 5000);
      if (dimmed) {
        deck.setBrightness(50);
        dimmed = false;
      } else {
        const clip = getClipRef.current?.(keyIndex);
        if (clip) {
          drawButton(deck, keyIndex, clip, true);
          playClipRef.current?.(keyIndex);
        }
      }
    });
    deck.on("up", (keyIndex) => {
      const clip = getClipRef.current?.(keyIndex);
      if (clip) {
        drawButton(deck, keyIndex, clip);
      }
    });

    setDeck(deck);
  }, []);

  useEffect(() => {
    if (deck) {
      clips.forEach((clip, i) => {
        drawButton(deck, i, clip);
      });
    }
  }, [deck, clips]);

  const handleDisconnectStreamDeck = useCallback(async () => {
    deck?.setBrightness(10);
    deck?.resetToLogo();
    deck?.close();
    setDeck(undefined);
  }, [deck]);

  useEffect(() => {
    return () => {
      deck?.setBrightness(10);
      deck?.resetToLogo();
      deck?.close();
    };
  }, [deck]);

  return deck ? (
    <Button onClick={handleDisconnectStreamDeck}>
      Disconnect {deck.PRODUCT_NAME}
    </Button>
  ) : (
    <Button onClick={handleConnectStreamDeck}>Connect Stream Deck</Button>
  );
}
