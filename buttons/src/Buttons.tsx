import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import {
  AspectRatio,
  Box,
  Card,
  CardOverflow,
  Chip,
  IconButton,
  TextField,
  Typography,
} from "@mui/joy";
import OpenInNew from "mdi-material-ui/OpenInNew";
import VolumeHigh from "mdi-material-ui/VolumeHigh";
import VolumeOff from "mdi-material-ui/VolumeOff";
import fuzzysort from "fuzzysort";

interface Clip {
  id: string;
  name: string;
  file: string;
  start?: number;
  end?: number;
  tags: string[];
}

const streamId = location.href
  .split("/")
  .find((part, i, parts) => parts[i - 1] === "streams");

function App() {
  const [filter, setFilter] = useState("");
  const tags = useMemo(
    () =>
      filter
        .toLowerCase()
        .split(" ")
        .filter((word) => word.startsWith("tag:"))
        .map((tag) => tag.substring(4)),
    [filter]
  );

  const searchFieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        const input = searchFieldRef.current?.querySelector("input");
        input?.focus();
        input?.select();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, []);

  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => {
    let stale = false;
    fetch("/clips")
      .then((res) => res.json())
      .then((clips) => {
        if (!stale) {
          setClips(clips);
        }
      });

    return () => {
      stale = true;
    };
  }, []);

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (tags.includes(tag)) {
        setFilter((filter) =>
          filter
            .split(" ")
            .filter((word) => word !== `tag:${tag}`)
            .join(" ")
        );
      } else {
        setFilter((filter) => `${filter} tag:${tag}`);
      }
    },
    [tags]
  );

  const visibleClips = useMemo(
    () =>
      fuzzysort.go(
        filter
          .replace(/tag:[^\s]*/g, "")
          .replace(/\s+/g, " ")
          .trim(),
        clips.filter(
          (clip) =>
            tags.length === 0 || tags.some((tag) => clip.tags.includes(tag))
        ),
        {
          all: true,
          key: "name",
        }
      ),
    [tags, clips]
  );

  const handlePlayClip = useCallback(async (clip: Clip) => {
    await fetch(`/streams/${streamId}`, {
      method: "POST",
      body: "clip=" + encodeURIComponent(clip.id),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
    });
  }, []);

  const [muted, setMuted] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const handleToggleSound = useCallback(() => {
    previewRef.current?.contentWindow?.postMessage(muted ? "unmute" : "mute");
    setMuted(!muted);
  }, [muted]);

  return (
    <CssVarsProvider>
      <Box sx={{ display: "flex" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            height: "100vh",
          }}
        >
          <TextField
            size="lg"
            componentsProps={{ input: { ref: searchFieldRef } }}
            placeholder="Search…"
            autoFocus
            endDecorator={
              <Chip
                variant="soft"
                size="sm"
                color="neutral"
                sx={{ borderRadius: 5, marginRight: -0.5 }}
              >
                Ctrl+K
              </Chip>
            }
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <Box
            sx={{
              overflowY: "auto",
              marginTop: 1,
              width: 400,
            }}
          >
            {visibleClips.map((result) => {
              const clip = result.obj;
              return (
                <Card
                  key={clip.id}
                  variant="outlined"
                  row
                  sx={{
                    maxWidth: 800,
                    height: 84 - 32,
                    gap: 2,
                    marginBottom: 1,
                    "&:hover": {
                      boxShadow: "md",
                      borderColor: "neutral.outlinedHoverBorder",
                    },
                  }}
                >
                  <CardOverflow>
                    <AspectRatio
                      ratio="1"
                      sx={{
                        width: 84,
                        cursor: "pointer",
                      }}
                      onClick={() => handlePlayClip(clip)}
                    >
                      <div
                        style={{
                          background: `url(/clips/${clip.id}/thumbnail.jpg)`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          width: "100%",
                          height: "100%",
                        }}
                      />
                    </AspectRatio>
                  </CardOverflow>
                  <div style={{ overflow: "hidden" }}>
                    <Typography
                      level="h2"
                      fontSize="md"
                      id="card-title"
                      mb={0.5}
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={clip.name}
                    >
                      {clip.name}
                    </Typography>
                    {clip.tags.map((tag) => (
                      <Chip
                        key={tag}
                        variant={tags.includes(tag) ? "solid" : "outlined"}
                        color="primary"
                        size="sm"
                        sx={{ marginRight: 0.5 }}
                        onClick={() => handleToggleTag(tag)}
                      >
                        {tag}
                      </Chip>
                    ))}
                  </div>
                </Card>
              );
            })}
          </Box>
        </Box>
        <Card
          sx={{ marginLeft: 2, alignSelf: "flex-start", padding: 0 }}
          variant="outlined"
        >
          <AspectRatio ratio={16 / 9} sx={{ width: 400 }}>
            <iframe
              src={`/streams/${streamId}`}
              style={{ border: "none", width: "100%", height: "100%" }}
              ref={previewRef}
            ></iframe>
          </AspectRatio>
          <IconButton
            onClick={handleToggleSound}
            variant="plain"
            color="neutral"
            sx={{
              position: "absolute",
              right: 0,
              bottom: 0,
              color: "#fff",
              background: "rgba(0,0,0,0.78)",
              borderBottomLeftRadius: 0,
              borderTopRightRadius: 0,
            }}
          >
            {muted ? <VolumeOff /> : <VolumeHigh />}
          </IconButton>
          <IconButton
            onClick={() => window.open(`/streams/${streamId}`)}
            variant="plain"
            color="neutral"
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              color: "#fff",
              background: "rgba(0,0,0,0.78)",
              borderTopLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          >
            <OpenInNew />
          </IconButton>
        </Card>
      </Box>
    </CssVarsProvider>
  );
}

export default App;
