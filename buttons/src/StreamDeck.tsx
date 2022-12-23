import { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/joy";
import type { StreamDeck } from "@elgato-stream-deck/webhid";

export default function StreamDeckComponent({}) {
  const [deck, setDeck] = useState<StreamDeck>();
  const handleConnectStreamDeck = useCallback(async () => {
    const { requestStreamDecks } = await import("@elgato-stream-deck/webhid");
    const streamDecks = await requestStreamDecks();
    const deck = streamDecks[0];
    setDeck(deck);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = deck.ICON_SIZE;
    const ctx = canvas.getContext("2d")!;

    const drawButton = async (
      keyIndex: number,
      imageSource: string,
      label: string
    ) => {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject();
        image.src = imageSource;
      }).catch(() => null);
      if (img) {
        var scale = Math.max(
          canvas.width / img.width,
          canvas.height / img.height
        );
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
      canvas.remove();
      await deck.fillKeyCanvas(keyIndex, canvas);
    };

    await deck.clearPanel();
    await drawButton(0, "/dornige-chancen.jpg", "Dornige Chancen");
    await drawButton(1, "/fatal.jpg", "Das ist fatal!");

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
        alert(keyIndex);
      }
    });
  }, []);

  const handleDisconnectStreamDeck = useCallback(async () => {
    deck?.close();
    setDeck(undefined);
  }, [deck]);

  useEffect(() => {
    return () => {
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
