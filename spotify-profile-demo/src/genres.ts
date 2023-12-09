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

  // 3. Fetch the user's top genres
  const topGenres = await fetchTopArtists(accessToken, 'long_term');
  if (topGenres) {
    populateGenres(topGenres);
  }
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