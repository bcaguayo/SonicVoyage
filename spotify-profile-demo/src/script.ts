/**
 * This script is responsible for retrieving the user's Spotify profile information
 * using the Spotify Web API. It includes functions for obtaining an access token,
 * fetching the user's profile data, and updating the UI with the retrieved data.
 */

const client_id = 'a509ebf3f1ed40f99b6c1c645a149032';
const client_secret = '58b18245f2624fa3bfae813e356cc346';
var token: string;

const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
  console.log("No code provided");
  redirectToAuthCodeFlow(client_id);
} else {
  console.log("Code provided, fetching access token");
  const accessToken = await getAccessToken(client_id, code);
  console.log('Token', accessToken);
  const profile = await fetchProfile(accessToken);
  console.log('Profile Object:', profile);
  populateUI(profile);
}

export async function redirectToAuthCodeFlow(clientId: string) {
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("response_type", "code");
  params.append("redirect_uri", "http://localhost:5173/callback");
  params.append("scope", "user-read-private user-read-email");

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

var authOptions = {
  url: 'https://accounts.spotify.com/api/token',
  headers: {
    'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
  },
  form: {
    grant_type: 'authorization_code',
    code: 'AUTHORIZATION_CODE',  // Replace with the actual authorization code
    redirect_uri: 'http://localhost:5173/callback'  // Replace with your actual redirect URI
  },
  json: true
};

// request.post(authOptions, function(error, response, body) {
//   if (!error && response.statusCode === 200) {
//     token = body.access_token;
//   }
// });

// Make the request to exchange the authorization code for an access token
request.post(authOptions, function(error, response, body) {
  if (!error && response.statusCode === 200) {
    token = body.access_token;

    // Now you can use the 'token' variable for making authenticated requests to the Spotify API.
    // For example, you can call the 'fetchProfile' function.
    fetchProfile(token);
  } else {
    // Handle errors
    console.error('Error exchanging authorization code for access token:', error);
  }
});

/**
 * Retrieves the user's Spotify profile using the provided access token.
 * @param accessToken The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
 */

// async function getProfile(accessToken: string): Promise<any> {
//   const response = await fetch('https://api.spotify.com/v1/me', {
//     headers: {
//       Authorization: 'Bearer ' + accessToken
//     }
//   });

//   const data = await response.json();
//   printData(data);
// }

/**
 * Fetches the user's Spotify profile using the provided access token.
 * @param token The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
 */
async function fetchProfile(token) {
  const result = await fetch("https://api.spotify.com/v1/me", {
      method: "GET", headers: { Authorization: `Bearer ${token}` }
  });

  if (result.ok) {
    const data = await result.json();
    console.log(data);
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
  document.getElementById("displayName")!.innerText = profile.display_name;
  if (profile.images[0]) {
      const profileImage = new Image(200, 200);
      profileImage.src = profile.images[0].url;
      document.getElementById("avatar")!.appendChild(profileImage);
  }
  document.getElementById("id")!.innerText = profile.id;
  document.getElementById("email")!.innerText = profile.email;
  document.getElementById("uri")!.innerText = profile.uri;
  document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
  document.getElementById("url")!.innerText = profile.href;
  document.getElementById("url")!.setAttribute("href", profile.href);
  document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)';
}