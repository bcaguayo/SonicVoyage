/**
 * This script is responsible for retrieving the user's Spotify profile information
 * using the Spotify Web API. It includes functions for obtaining an access token,
 * fetching the user's profile data, and updating the UI with the retrieved data.
 */

const client_id = 'a509ebf3f1ed40f99b6c1c645a149032';
const client_secret = '58b18245f2624fa3bfae813e356cc346';

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  console.log("No code provided");
  redirectToAuthCodeFlow(client_id);
} else {
  console.log("Code provided, fetching access token");
  initializePageValues(code);
}

// ______________________________ INITIALIZERS ______________________________
export async function redirectToAuthCodeFlow(clientId: string) {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email user-read-recently-played user-top-read");

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function initializePageValues(code: string) {
  // 1. Get the access token
  const accessToken = await getAccessToken(client_id, code);

  // 2. Fetch the user's profile data
  const profile = await fetchProfile(accessToken);
  populateUI(profile);

  // 3. Fetch the user's recent tracks
  const recentTracks = await fetchRecentTracks(accessToken);
  if (recentTracks) {
    populateTracks(recentTracks);
  }

  // 4. Fetch the user's top genres
  const topGenres = await fetchTopArtists(accessToken, 'long_term');
  if (topGenres) {
    populateGenres(topGenres);
  }

  // 5. Fetch the user's audio features
  const properties = ['acousticness', 'danceability', 'energy', 'instrumentalness',
    'liveness', 'loudness', 'speechiness', 'tempo', 'valence'];

  // 5a. Fetch audio features for recent tracks
  // THIS IS NO LONGER FAILING YAY
  const recentFeatures = await getTrackFeatures(0, [], recentTracks, accessToken);
  const recentfeaturesMap = await getAverage(properties, recentFeatures);
  // Print each value of recentfeaturesMap
  populateSongTable(properties, recentfeaturesMap, 'recent');

  // 5b. Fetch audio features for top tracks of the last 4 weeks
  const topSTracks = await fetchTopTracks(accessToken, false);
  const topSFeatures = await getTrackFeatures(1, [], topSTracks, accessToken);
  const topSFeaturesMap = await getAverage(properties, topSFeatures);
  populateSongTable(properties, topSFeaturesMap, 'topShort');

  // 5c. Fetch audio features for top tracks of the last year
  const topTracks = await fetchTopTracks(accessToken, true);
  const topFeatures = await getTrackFeatures(1, [], topTracks, accessToken);
  const topFeaturesMap = await getAverage(properties, topFeatures);
  populateSongTable(properties, topFeaturesMap, 'topLong');

  // 5d. Fetch top songs by genre
  const topSongsinGenre = await fetchTopSongsByGenre(accessToken, 'pop');
  console.log('topSongsinGenre');
  // Print top songs in genre
  const songFeatures = await getTrackFeatures(2, topSongsinGenre, topTracks, accessToken);
  const topSongFeaturesMap = await getAverage(properties, songFeatures);

  // Print Features
  topSongFeaturesMap.forEach((value, key) => {
    console.log(key + ' = ' + value);
  });

  // Print song features
  

  // const topSongsFeatures = await getTrackFeatures(false, topSongsinGenre, accessToken);
}



// ______________________________ ACCESS TOKEN ______________________________
export async function getAccessToken(clientId: string, code: string): Promise<string> {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", client_secret);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", "http://localhost:5173/callback");

  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const { access_token } = await result.json();
  return access_token;
}

// ______________________________ PROFILE SECTION ______________________________

/**
 * Fetches the user's Spotify profile using the provided access token.
 * @param token The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
 */
async function fetchProfile(token: string) {
  const result = await fetch("https://api.spotify.com/v1/me", {
    method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  if (result.ok) {
    const data = await result.json();
    return data;  // Return the data
  } else {
    console.error("Error fetching profile:", result.statusText);
    // You might want to throw an error or handle the error in some way
  }
}

/**
 * Updates the UI with the user's profile information.
 * @param profile The user's profile data.
 */
function populateUI(profile: any) {
  const firstName = profile.display_name.split(" ")[0];
  document.getElementById("displayName")!.innerText = firstName;
  if (profile.images[0]) {
    const profileImage = new Image();
    profileImage.src = profile.images[1].url;
    document.getElementById("avatar")!.appendChild(profileImage);
  }
}

// ______________________________ RECENT TRACKS ______________________________

// Function to fetch recent tracks
async function fetchRecentTracks(token: string) {
  const result = await fetch("https://api.spotify.com/v1/me/player/recently-played", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    console.error("Error fetching recent tracks:", result.statusText);
    return null;
  }

  const recentTracks = await result.json();
  return recentTracks;
}

// Function to populate the HTML with recent tracks
function populateTracks(recentTracks: { items: any[]; }) {
  const recentTracksList = document.getElementById("recentTracks");
  if (!recentTracksList) {
    console.error("No recent tracks list element found.");
    return;
  }

  recentTracksList.innerHTML = ""; // Clear previous content

  recentTracks.items.forEach((track) => {
    const trackItem = document.createElement("li");
    trackItem.innerText = track.track.name;
    recentTracksList.appendChild(trackItem);
  });
}

// ______________________________ TOP TRACKS ______________________________

async function fetchTopTracks(token: string, long: boolean) {
  const queryLong = `https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=50`;
  const queryShort = `https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50`;
  const query = long ? queryLong : queryShort;
  const result = await fetch(query, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    console.error("Error fetching top tracks:", result.statusText);
    return null;
  }

  const topTracks = await result.json();
  return topTracks;
}

// ______________________________ TOP GENRES ______________________________

async function fetchTopArtists(token: string, term: string) {
  const query = `https://api.spotify.com/v1/me/top/artists?time_range=${term}&limit=50`;
  const result = await fetch(query, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    console.error("Error fetching top genres:", result.statusText);
    return null;
  }

  const topArtists = await result.json();
  return topArtists;
}

// Function to populate the HTML with top genres
function populateGenres(topGenres: { items: any[]; }, limit: number = 15) {
  const topGenresList = document.getElementById("topGenres");
  if (!topGenresList) {
    console.error("No top genres list element found.");
    return;
  }

  topGenresList.innerHTML = ""; // Clear previous content

  let genresList: any[] = [];
  topGenres.items.forEach((genre) => {
    for (let i = 0; i < genre.genres.length; i++) {
      if (!genresList.includes(genre.genres[i])) {
        genresList.push(genre.genres[i]);
      }
    }
  });

  for (let i = 0; i < limit; i++) {
    const genreItem = document.createElement("li");
    genreItem.innerText = genresList[i];
    topGenresList.appendChild(genreItem);
  }
}

// ____________________ FEATURES FOR TOP TRACKS IN EACH GENRE ____________________

// Function to fetch top songs by genre
async function fetchTopSongsByGenre(token: string, genre: string, limit: number = 50) {
  const query = `https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(genre)}&type=track&limit=${limit}`;
  const result = await fetch(query, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!result.ok) {
    console.error("Error fetching top songs by genre:", result.statusText);
    return null;
  }

  const topSongs = await result.json();
  return topSongs.tracks.items;
}

///// __________________________ AUDIO FEATURES __________________________ /////

async function fetchTrackIds(recent : boolean, tracks: { items: any[]; }) {
  return tracks.items.map((track) => recent ? track.track.id : track.id);;
}

async function fetchGenreIds(songs: any[]) {
  let songIds: any[] = [];
  songs.forEach((song: any) => {
    songIds.push(song.id);
  });
  return songIds;
}

// Function to fetch audio features for tracks
async function getTrackFeatures(bit : number, songs: any[], tracks: { items: any[]; }, token: string) {

  // Get the track IDs
  const trackIds = bit == 2 ? await fetchGenreIds(songs) : await fetchTrackIds(bit == 0, tracks);

  if (!trackIds) {
    console.error("No track IDs available for recently played tracks.");
    return [];
  }

  const maxIdsPerRequest = 100;
  const trackChunks = [];
  for (let i = 0; i < trackIds.length; i += maxIdsPerRequest) {
    trackChunks.push(trackIds.slice(i, i + maxIdsPerRequest));
  }

  const featuresArray = [];
  for (const chunk of trackChunks) {
    const idsQueryString = chunk.join(",");
    const audioFeaturesUrl = `https://api.spotify.com/v1/audio-features?ids=${idsQueryString}`;

    const audioFeaturesResult = await fetch(audioFeaturesUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!audioFeaturesResult.ok) {
      console.error(`Error fetching audio features: ${audioFeaturesResult.statusText}`);
      return [];
    }

    const audioFeaturesData = await audioFeaturesResult.json();
    featuresArray.push(...audioFeaturesData.audio_features);
  }
  return featuresArray;
}

async function getAverage(properties: string[], features: any) {
  const featuresMap = new Map<string, number>();
  for (const property of properties) {

    // Extract the property values from the features array
    const propertyValues = features.map((feature: { [x: string]: any; }) => feature[property]);

    // Calculate the average value
    const average = propertyValues.reduce((sum: number, value: number) => sum + value, 0) / propertyValues.length;

    featuresMap.set(property, average);
  }
  return featuresMap;
}

function toStringPercent(n: number) {
  return (n * 100).toFixed(2) + '%';
}

function makeSelector(filter: string, properties: string[]) {
  let selector = ''; // Initialize an empty string
  for (let i = 0; i < properties.length; i++) {
    selector += '#' + makeName(filter, properties[i]);
    if (i < properties.length - 1) {
      selector += ', ';
    }
  }
  return selector;
}

function makeName(filter: string, property: string) {
  return filter + property.charAt(0).toUpperCase() + property.slice(1);
}

// Function to populate the table with song analysis data
async function populateSongTable(properties: string[], features: Map<string, number>, filter: string) {

  // Check if the data is available
  if (!features) {
    console.error('Failed to fetch song analysis data');
    return;
  }

  // Make the selector
  const selector = makeSelector(filter, properties);

  // Get the table cells
  let cells = document.querySelectorAll(selector);

  // Loop through all table descriptions and populate with data
  for (let i = 0; i < cells.length; i++) {
    let data = features.get(properties[i]);
    if (!data) {
      console.error('No data available for ' + properties[i]);
      continue;
    }
    const dataString = properties[i] == 'loudness' || properties[i] == 'tempo' ?
      data.toFixed(2) : toStringPercent(data);
    if (!cells[i].textContent) {
      cells[i].textContent = dataString;
    }
  }
}