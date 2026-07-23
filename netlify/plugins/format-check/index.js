module.exports = {
  async onPreBuild({ utils }) {
    await utils.run.command("bun run format:check");
  },
};
