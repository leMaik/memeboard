# memeboard

A small tool to serve your memes into your streams or Teams.

## Getting started

1. Clone this repo (or download the zipfile)
2. Install the dependencies: `npm ci`
3. Build the frontend: `npm run build --workspace buttons`
4. Start the server: `npm run start`
5. Click on the displayed link (eg. http://localhost:3000) to get started

You can now start building your memes collection.

### Adding memes

1. If you don't have a `clips.json` file yet, copy the example file: `cp clips.example.json clips.json`
2. If it doesn't exist yet, create a `videos` directory to put your clips in: `mkdir videos`  
   Memeboard supports anything that Chromium can play, eg. webm and mp4
3. Add/edit items as needed. The `start` and `end` are in seconds, both are optional. This means you can simply add long videos and don't need to cut and re-encode it – just set `start` and `end` accordingly.

### Playing memes

The output of your memeboard is at `/streams/:stream` (the buttons being at `/streams/:stream/buttons`). Click on a thumbnail to play a clip.

Replace `:stream` with your stream ID, which can be anything – you can have multiple streams at once.

#### Webhooks

```
curl -X POST -d clip=clip-id http://localhost:3000/streams/:stream
```

Replace the clip-id with the ID in the `clips.json` file.

### Setup with OBS and Teams

1. In your OBS scene, add the memeboard output URL as a _Browser Source_ on top of a _Camera Source_.

2. Add your headset as audio source to the OBS scene.

3. Configure the audio output of the _Browser Source_ to _Monitor and Output_. Set the Monitor device to a [virtual audio cable](https://vac.muzychenko.net/en/index.htm). Select the OBS virtual camera and the virtual audio cable as input in Teams.

4. (Optional) Ask your colleages to do a short test.

5. Surprise your co-workers with memes (use sparingly for maximum effect)!

## License

Copyright 2022 Maik Marschner (leMaik)

Memeboard is licensed under the MIT license. Read the `LICENSE` file for more information.
