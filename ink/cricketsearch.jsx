import querystring from "querystring";
import got from "got";
import { Box, StdinContext, Text } from "ink";
import Spinner from "ink-spinner";
import * as React from "react";
import { logger } from "./log";

const CRICKETNEWS_API_BASE_URL = process.argv[2]
  ? process.argv[2]
  : "https://cricapi.com";

logger.info(`CRICKETNEWS_API_BASE_URL: ${CRICKETNEWS_API_BASE_URL}`);

const CricketnewsAPI = {
  searchByDate: async query => {
    const searchByMatchUrl = `${CRICKETNEWS_API_BASE_URL}/api/matches?apikey=qQVlWJVITjd4nWEgWWKMs4P1Hj23`;
    const { body } = await got(searchByMatchUrl);
    return JSON.parse(body)
      .matches.slice(0, 10)
      .map(match => ({
        title: `${match["team-1"]} Vs ${match["team-2"]} ${match["type"]}`,
        id: match.unique_id
      }));
  }
};

const initialState = {
  query: "",
  isLoading: false,
  results: []
};

const reducer = (state, action) => {
  switch (action.type) {
    case "KEYSTROKE_RECEIVED": {
      return {
        ...state,
        query: `${state.query}${action.payload}`
      };
    }

    case "RESULTS_LOADING": {
      return {
        ...state,
        isLoading: true,
        results: [],
        query: ""
      };
    }

    case "RESULTS_RECEIVED": {
      return {
        ...state,
        isLoading: false,
        results: action.payload
      };
    }

    default:
      throw new Error(`unexpected action ${action}`);
  }
};

const useStdin = keyListener => {
  const { stdin, setRawMode } = React.useContext(StdinContext);

  React.useLayoutEffect(() => {
    setRawMode(true);
    stdin.on("keypress", keyListener);

    return () => {
      stdin.removeListener("keypress", keyListener);
      setRawMode(false);
    };
  }, [keyListener, setRawMode, stdin]);
};

export const CricketSearch = ({ cricketnewsAPI = CricketnewsAPI }) => {
  const [{ query, isLoading, results }, dispatch] = React.useReducer(
    reducer,
    initialState
  );

  const keyListener = React.useMemo(
    () => async (_, key) => {
      if (key.name === "return") {
        dispatch({ type: "RESULTS_LOADING" });
        const results = await cricketnewsAPI.searchByDate(query);
        dispatch({ type: "RESULTS_RECEIVED", payload: results });
      } else {
        dispatch({ type: "KEYSTROKE_RECEIVED", payload: key.sequence });
      }
    },
    [cricketnewsAPI, query]
  );

  useStdin(keyListener);

  return (
    <Box flexDirection="column">
      <Box>List of cricket matches across the globe!</Box>
      <Box marginLeft={2} marginY={1} flexDirection="column">
        {isLoading ? <Loading /> : <Results results={results} />}
      </Box>
      <Box>Type the number to know more about the match</Box>
      <Box>{`>_ ${query}█`}</Box>
    </Box>
  );
};

const Loading = () => (
  <Box>
    <Spinner type="dots" /> <Text>loading</Text>
  </Box>
);

const Results = ({ results }) => (
  <Box flexDirection="column">
    {results.map((result, index) => {
      return (
        <Box key={result.id}>
          {index + 1}. <Text bold>{result.title}</Text>
        </Box>
      );
    })}
  </Box>
);
