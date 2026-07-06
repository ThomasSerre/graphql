const GRAPHQL_URL = "https://zone01normandie.org/api/graphql-engine/v1/graphql";

async function gql(query) {
  const token = localStorage.getItem("jwt");

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({
      query,
    }),
  });

  const data = await response.json();

  console.log("token : ".token);

  if (data.errors) {
    console.error(data.errors);

    throw new Error("Erreur GraphQL");
  }

  return data.data;
}
