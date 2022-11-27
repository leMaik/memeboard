import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { CssVarsProvider } from "@mui/joy/styles";
import {
  AspectRatio,
  Box,
  Card,
  CardOverflow,
  Chip,
  IconButton,
  Slider,
  TextField,
  Typography,
  LinearProgress,
} from "@mui/joy";
import OpenInNew from "mdi-material-ui/OpenInNew";
import VolumeHigh from "mdi-material-ui/VolumeHigh";
import VolumeOff from "mdi-material-ui/VolumeOff";
import fuzzysort from "fuzzysort";
import Replay from "mdi-material-ui/Replay";

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

  const [filename, setFilename] = useState("");
  const [time, setTime] = useState(0);
  useEffect(() => {
    document.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    document.addEventListener("drop", async (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file) {
        const url = URL.createObjectURL(new Blob([await file.arrayBuffer()]));
        setFilename(file.name);
        const video = document.getElementById("video") as HTMLVideoElement;
        const handleLoadedData = () => {
          setMax(video.duration);
          setRange([0, video.duration]);
          video.removeEventListener("loadeddata", handleLoadedData);
        };
        video.addEventListener("loadeddata", handleLoadedData);
        video.src = url;
      }
    });

    const video = document.getElementById("video") as HTMLVideoElement;
    video.addEventListener("timeupdate", () => {
      setTimeout(video.currentTime);
    });
  }, []);

  const [max, setMax] = useState(0);
  const [range, setRange] = useState([0, 0]);
  const handleChangeRange = useCallback(
    (e: Event, newRange: [min: number, max: number]) => {
      setRange(newRange);
    },
    []
  );
  useEffect(() => {
    const video = document.getElementById("video") as HTMLVideoElement;
    const url = video.src.split("#")[0];
    video.src = `${url}#t=${range[0]},${range[1]}`;
    video.play();
  }, [range]);
  const handleReplayVideo = useCallback(() => {
    const video = document.getElementById("video") as HTMLVideoElement;
    const url = video.src.split("#")[0];
    video.src = "";
    video.src = `${url}#t=${range[0]},${range[1]}`;
    video.play();
  });

  return (
    <CssVarsProvider>
      <Box sx={{ display: "flex", padding: 1, height: "calc(100vh - 16px)" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateRows: "auto 1fr",
            height: "100%",
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
        <div>
          <video width="400" height="200" id="video" />
          <LinearProgress value={(time / max) * 100} />
          <div>
            <Slider
              value={range}
              min={0}
              max={max}
              step={0.01}
              onChange={handleChangeRange}
              valueLabelDisplay="auto"
              size="sm"
              variant="solid"
              valueLabelFormat={(value) => `${value} s`}
            />
            <IconButton onClick={handleReplayVideo}>
              <Replay />
            </IconButton>
          </div>
          <TextField
            label="Start"
            type="number"
            value={range[0]}
            onChange={(e) => {
              setRange((r) => [parseFloat(e.target.value), r[1]]);
            }}
            endDecorator="s"
          />
          <TextField
            label="End"
            type="number"
            value={range[1]}
            onChange={(e) => {
              setRange((r) => [r[0], parseFloat(e.target.value)]);
            }}
            endDecorator="s"
          />
          <pre>
            {JSON.stringify(
              {
                id: "",
                name: "",
                file: filename,
                start: range[0],
                end: range[1],
                tags: [],
              },
              null,
              2
            )}
          </pre>
        </div>
      </Box>
    </CssVarsProvider>
  );
}

export default App;
