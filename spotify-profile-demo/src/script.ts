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
  const accessToken = await getAccessToken(client_id, code);
  // console.log('Token', accessToken);
  const profile = await fetchProfile(accessToken);
  console.log('Profile Object:', profile);
  populateUI(profile);

  const recentTracks = await fetchRecentTracks(accessToken);
  console.log('Recent Tracks:', recentTracks);
  if (recentTracks) {
    populateTracks(recentTracks);
  }

  // Call the function with the recent tracks and the access token
  const features = await getTrackFeatures(recentTracks, accessToken);
  const properties = ['acousticness', 'danceability', 'energy', 'instrumentalness', 
                      'liveness', 'loudness', 'speechiness', 'tempo', 'valence'];
  const featuresMap = await getAverage(properties, features);
  console.log(featuresMap);
  populateSongTable(properties, featuresMap);
}

export async function redirectToAuthCodeFlow(clientId: string) {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email user-read-recently-played");

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

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
 * Fetches the user's Spotify profile using the provided access token.
 * @param token The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
//  */
// async function fetchProfile(token: string): Promise<any> {
//     const result = await fetch("https://api.spotify.com/v1/me", {
//         method: "GET", headers: { Authorization: `Bearer ${token}` }
//     });

//     return await result.json();
// }

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
  // console.log("Recent tracks:", recentTracks);
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

// Function to fetch audio features for tracks
async function getAverageTempoForTracks(recentTracks: { items: any[]; }, token: string) {
  // Extract Spotify IDs from recently played tracks
  const trackIds = recentTracks.items.map((track) => track.track.id);

  // Check if there are any tracks to fetch audio features for
  if (trackIds.length === 0) {
    console.error("No track IDs available for recently played tracks.");
    return;
  }

  // Ensure the number of IDs does not exceed the maximum allowed (100 IDs)
  const maxIdsPerRequest = 100;
  const tracks = [];
  for (let i = 0; i < trackIds.length; i += maxIdsPerRequest) {
    tracks.push(trackIds.slice(i, i + maxIdsPerRequest));
  }

  // Fetch audio features for each chunk of track IDs
  const tempoArray = [];
  for (const track of tracks) {
    const idsQueryString = track.join(',');
    const audioFeaturesUrl = `https://api.spotify.com/v1/audio-features?ids=${idsQueryString}`;

    const audioFeaturesResult = await fetch(audioFeaturesUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!audioFeaturesResult.ok) {
      console.error(`Error fetching audio features: ${audioFeaturesResult.statusText}`);
      return;
    }

    const audioFeaturesData = await audioFeaturesResult.json();

    // Extract the tempo from each audio feature and add it to the array
    tempoArray.push(...audioFeaturesData.audio_features.map((feature: { tempo: any; }) => feature.tempo));
  }

  var averageTempo = 0;
  // Calculate the average tempo
  if (tempoArray.length > 0) {
    averageTempo = tempoArray.reduce((sum, tempo) => sum + tempo, 0) / tempoArray.length;
    console.log("Average Tempo for Recently Played Tracks:", averageTempo);
  } else {
    console.error("No tempo data available for recently played tracks.");
  }
  return averageTempo;
}

async function displayAverageTempo(recentTracks: any, token: string) {
  try {
    const tempo = await getAverageTempoForTracks(recentTracks, token);
    if (!tempo) {
      console.error("No tempo data available.");
      return;
    }
    document.getElementById("tempo")!.innerText = tempo.toFixed(2); // Assuming you want to display the tempo with two decimal places
  } catch (error) {
    console.error("Error getting average tempo:", error);
  }
}

// Function to fetch audio features for tracks
async function getTrackFeatures(recentTracks: { items: any[]; }, token: string) {
  const trackIds = recentTracks.items.map((track) => track.track.id);

  if (trackIds.length === 0) {
    console.error("No track IDs available for recently played tracks.");
    return;
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
      return;
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
    // console.log(`Average ${property}:`, average);
  }
  return featuresMap;
}

function toStringPercent(n : number) {
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

function makeName(filter :string, property : string) {
  return filter + property.charAt(0).toUpperCase() + property.slice(1);
}

// Function to populate the table with song analysis data
async function populateSongTable(properties : string[], features: Map<string, number>) {

  // Check if the data is available
  if (!features) {
    console.error('Failed to fetch song analysis data');
    return;
  }
  
  const selector = makeSelector('recent', properties);

  console.log('selector: ' + selector);

  // Get the table cells
  let recentCells = document.querySelectorAll(selector);

  console.log('recentCellLength: ' + recentCells.length);
  // const topShortCells = document.querySelectorAll(await makeSelector(properties, 'topShort'));
  // const topLongCells = document.querySelectorAll(await makeSelector(properties, 'topLong'));

  // Loop through all table descriptions and populate with data
  for (let i = 0; i < recentCells.length; i++) {
    let data = features.get(properties[i]);
    if (data) {
      const dataString = properties[i] == 'loudness' || properties[i] == 'tempo' ? 
                          data.toFixed(2) : toStringPercent(data);
      recentCells[i].textContent = dataString;
    }
  }
}