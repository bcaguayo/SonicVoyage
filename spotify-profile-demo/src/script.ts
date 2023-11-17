/**
 * This script is responsible for retrieving the user's Spotify profile information
 * using the Spotify Web API. It includes functions for obtaining an access token,
 * fetching the user's profile data, and updating the UI with the retrieved data.
 */

// const clientId = "a509ebf3f1ed40f99b6c1c645a149032"; // Replace with your client id
// const code = undefined;

const client_id = 'a509ebf3f1ed40f99b6c1c645a149032';
const client_secret = '58b18245f2624fa3bfae813e356cc346';
var token: string;


var authOptions = {
  url: 'https://accounts.spotify.com/api/token',
  headers: {
    'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
  },
  form: {
    grant_type: 'client_credentials'
  },
  json: true
};

request.post(authOptions, function(error, response, body) {
  if (!error && response.statusCode === 200) {
    token = body.access_token;
  }
});

/**
 * Retrieves the user's Spotify profile using the provided access token.
 * @param accessToken The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
 */
async function getProfile(accessToken: string): Promise<any> {
    // let accessToken = localStorage.getItem('access_token');
    accessToken = token;

    const response = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    });

    const data = await response.json
    printData(data);
}

/**
 * Fetches the user's Spotify profile using the provided access token.
 * @param token The access token for authenticating the API request.
 * @returns A Promise that resolves to the user's profile data.
 */
async function fetchProfile(token: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

// if (!code) {
//     redirectToAuthCodeFlow(clientId);
// } else {
//     const accessToken = await getAccessToken(clientId, code);
//     const profile = await fetchProfile(accessToken);
//     populateUI(profile);
// }

// async function redirectToAuthCodeFlow(clientId: string) {
//     // TODO: Redirect to Spotify authorization page
// }

// async function getAccessToken(clientId: string, code: string) {
//   // TODO: Get access token for code
// }

// async function fetchProfile(token: string): Promise<any> {
//     // TODO: Call Web API
// }

// function populateUI(profile: any) {
//     // TODO: Update UI with profile data
// }