// Shared PlayFab account-generation logic used by the Generator page.
// The static single-file export inlines this module verbatim, so keep it
// free of imports and JSX.

export function generateCustomId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${random}${random2}`.substring(0, 32);
}

export function generateRandomLocation() {
  const locations = [
    { country: "US", city: "New York", region: "NA" },
    { country: "US", city: "Los Angeles", region: "NA" },
    { country: "GB", city: "London", region: "EU" },
    { country: "DE", city: "Berlin", region: "EU" },
    { country: "FR", city: "Paris", region: "EU" },
    { country: "JP", city: "Tokyo", region: "AS" },
    { country: "AU", city: "Sydney", region: "OC" },
    { country: "CA", city: "Toronto", region: "NA" },
    { country: "BR", city: "São Paulo", region: "SA" },
    { country: "IN", city: "Mumbai", region: "AS" },
    { country: "SG", city: "Singapore", region: "AS" },
    { country: "NL", city: "Amsterdam", region: "EU" },
    { country: "SE", city: "Stockholm", region: "EU" },
    { country: "KR", city: "Seoul", region: "AS" },
    { country: "MX", city: "Mexico City", region: "AS" },
  ];

  const location = locations[Math.floor(Math.random() * locations.length)];
  const ip = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

  return { ...location, ip };
}

async function setUserData(titleId, sessionTicket, locationData) {
  try {
    const res = await fetch(`https://${titleId}.playfabapi.com/Client/UpdateUserData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket,
        "X-PlayFabSDK": "WebSDK-1.0.0"
      },
      body: JSON.stringify({
        Data: {
          Location: JSON.stringify(locationData)
        }
      }),
    });

    const data = await res.json();
    return data.data ? { success: true } : { success: false };
  } catch (error) {
    return { success: false };
  }
}

async function setDisplayName(titleId, sessionTicket, displayName) {
  try {
    const res = await fetch(`https://${titleId}.playfabapi.com/Client/UpdateUserTitleDisplayName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket,
        "X-PlayFabSDK": "WebSDK-1.0.0"
      },
      body: JSON.stringify({ DisplayName: displayName }),
    });

    const data = await res.json();
    return data.data ? { success: true } : { success: false, error: data.errorMessage };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createPlayFabAccount(titleId, customId, displayName = null, retries = 3) {
  const body = {
    TitleId: titleId,
    CustomId: customId,
    CreateAccount: true,
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`https://${titleId}.playfabapi.com/Client/LoginWithCustomID`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PlayFabSDK": "WebSDK-1.0.0"
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Check for successful response
      if (data.data && data.data.PlayFabId) {
        const locationData = generateRandomLocation();

        const result = {
          success: true,
          playFabId: data.data.PlayFabId,
          newlyCreated: data.data.NewlyCreated,
          sessionTicket: data.data.SessionTicket,
          location: locationData
        };

        if (data.data.SessionTicket) {
          // Set display name if provided
          if (displayName) {
            await setDisplayName(titleId, data.data.SessionTicket, displayName);
          }

          // Set location data
          await setUserData(titleId, data.data.SessionTicket, locationData);
        }

        return result;
      }

      // Handle error response
      const errorMsg = data.errorMessage || data.error || JSON.stringify(data);

      // Don't retry on certain errors (invalid title ID, etc)
      if (errorMsg.includes("TitleId") || errorMsg.includes("Invalid")) {
        return { success: false, error: errorMsg, fatal: true };
      }

      // Retry on rate limit or temporary errors
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }

      return { success: false, error: errorMsg };
    } catch (error) {
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      return { success: false, error: error.message };
    }
  }

  return { success: false, error: "Max retries reached" };
}