const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { GraphQLError } = require("graphql");
const crypto = require("crypto");
const { availableGamesEnum } = require("../enums/availableGames");
const { fileExists, readJsonFile, deleteFile, getDirectoryFileNames } = require("../utils/fileHandling");

const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const writeFileAsync = promisify(fs.writeFile);
const cartDirectory = path.join(__dirname, "..", "content", "carts");
const gameDirectory = path.join(__dirname, "..", "content", "games");

const resolvers = {
  Query: {
    getCartById: async (_, { cartId }) => {
      try {
        const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
        const cartData = await readFileAsync(cartFilePath, "utf-8");
        return JSON.parse(cartData);
      } catch (error) {
        throw new GraphQLError("Den här varukorgen finns inte!");
      }
    },
    getAllCarts: async () => {
      try {
        const carts = await readdirAsync(cartDirectory);
        const cartData = [];
        for (const file of carts) {
          const filePath = path.join(cartDirectory, file);
          const fileContents = await readFileAsync(filePath, "utf-8");
          const data = JSON.parse(fileContents);
          cartData.push(data);
        }
        return cartData;
      } catch (error) {
        throw new GraphQLError("Ett fel uppstod när varukorgarna hämtades!");
      }
    },
    getGameById: async (_, { gameId }) => {
      try {
        const gameFilePath = path.join(gameDirectory, `${gameId}.json`);
        const gameData = await readFileAsync(gameFilePath, "utf-8");
        return JSON.parse(gameData);
      } catch (error) {
        throw new GraphQLError("Den här produkten finns inte i sortimentet!");
      }
    },
  },
  Mutation: {
    createCart: async (_, args) => {
      const games = [];
      let price = 0;

      const newCart = {
        id: crypto.randomUUID(),
        amountOfGames: games.length,
        games,
        totalPrice: price,
      };
      let filePath = path.join(cartDirectory, `${newCart.id}.json`);

      while (await fileExists(filePath)) {
        newCart.id = crypto.randomUUID();
        filePath = path.join(cartDirectory, `${newCart.id}.json`);
      }

      await writeFileAsync(filePath, JSON.stringify(newCart));

      return newCart;
    },

    addGameToCart: async (_, args) => {
      const { cartId, chosenGame } = args.input;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) {
        return new GraphQLError("Den här varukorgen finns inte!");
      }
      const cartJSON = await readFileAsync(cartFilePath, "utf-8");
    
      const cartData = JSON.parse(cartJSON);
      let listOfgame = await getDirectoryFileNames(gameDirectory);
    
      const availableGames = [];
      let games = cartData.games || [];
      for (const file of listOfgame) {
        const GamefilePath = path.join(gameDirectory, file);
    
        const fileContents = await readFileAsync(GamefilePath, "utf-8");
    
        const data = JSON.parse(fileContents);
    
        availableGames.push(data);
      }
    
      if (args.input.chosenGame === availableGamesEnum.LOL) {
        games.push(availableGames[0]);
      }
    
      if (args.input.chosenGame === availableGamesEnum.STARCRAFT) {
        games.push(availableGames[1]);
      }
    
      if (args.input.chosenGame === availableGamesEnum.ELDENRING) {
        games.push(availableGames[2]);
      }
    
      if (args.input.chosenGame === availableGamesEnum.MINECRAFT) {
        games.push(availableGames[3]);
      }
    
      if (args.input.chosenGame === availableGamesEnum.CSGO) {
        games.push(availableGames[4]);
      }
      let price = 0;
      for (let i = 0; i < games.length; i++) {
        price += games[i].gamePrice;
      }
      let updatedCart = {
        id: cartData.id,
        amountOfGames: games.length,
        games: games,
        totalPrice: price,
      };
      await writeFileAsync(cartFilePath, JSON.stringify(updatedCart));
      return updatedCart;
    },

    removeGameFromCart: async (_, args) => {
      const { cartId, chosenGame } = args.input;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) {
        throw new GraphQLError("Den här varukorgen finns inte!");
      }
      const cartJSON = await readFileAsync(cartFilePath, "utf-8");
      const cartData = JSON.parse(cartJSON);
  
      const gameIndex = cartData.games.findIndex(game => game.name === chosenGame);
      if (gameIndex === -1) {
        throw new GraphQLError("Fanns inte i varukorgen");
      }
  
      const removedGame = cartData.games.splice(gameIndex, 1)[0];
  
      const price = cartData.games.reduce((total, game) => total + game.gamePrice, 0);
      const updatedCart = {
        id: cartData.id,
        amountOfGames: cartData.games.length,
        games: cartData.games,
        totalPrice: price,
      };
  
      await writeFileAsync(cartFilePath, JSON.stringify(updatedCart));
  
      return updatedCart;
    },

      deleteCart: async (_, { cartId }) => {
        const filePath = path.join(cartDirectory, `${cartId}.json`);
        try {
          await deleteFile(filePath);
          return {
            deletedId: cartId,
            success: true,
          };
        } catch (error) {
          return {
            deletedId: cartId,
            success: false,
          };
        }
      },
  },
};

module.exports = { resolvers };