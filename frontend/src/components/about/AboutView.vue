<script setup>
defineEmits(["back"]);
</script>

<template>
  <div class="about-page">
    <div class="back-btn-wrapper">
      <button @click="$emit('back')" class="back-btn">← Back to App</button>
    </div>

    <h2>About</h2>
    <details>
      <summary>Walkscape Gear Tool</summary>

      <section class="about-content">
        <p>
          Walkscape Gear tool is a planning and calculation tool for the game
          Walkscape, designed to help players optimize their loadouts for
          different activities, and track their progress. Whether you're
          min-maxing or just want to keep track of your progress, I hope this
          tool makes it easier.
        </p>
        <p>
          The tool is heavily inspired by Arky's Walkscape Activity Sheet, and I
          hoped to create something similar, not bound by the limitations of
          Google Sheets.
        </p>
        <p>
          I've made a conscious choice to keep this tool free, ad-free, and
          subscription-free. I built it because I needed it - and I wanted to
          share it with others who might find it useful too.
        </p>
        <p>
          If you've gotten value from it and want to support the project, I
          really appreciate it - but I'm still figuring out a way to accept
          support that's legal and simple under Finnish law (donation rules here
          are a bit tricky).
        </p>
        <p>
          Once I have something set up (likely a small one-time unlock or
          symbolic perk through a proper platform), I'll update this page.
        </p>
        <p>
          In the meantime, just using the tool, sharing it, or sending feedback
          is already a big help. 💙
        </p>
      </section>
    </details>
    <details>
      <summary>Bugs, Features & Feedback</summary>
      <section class="about-content">
        <p>
          If you find any bugs or have ideas for further improvement, you can
          find a thread for the gear tool in the wiki-organization section of
          the main walkscape discord server.
        </p>
        <h3>Known issues</h3>
        <ul>
          <li>Roll special table-stat instead of the actual loot table name</li>
          <li>Money drops not visible</li>
        </ul>
        <h3>Planned features</h3>
        <ul>
          <li>Ability to save/load gear sets</li>
          <li>Calculated gold/tokens per step values for Drops section</li>
          <li>Gear set optimizer</li>
          <li>Comparing gear sets</li>
          <li>
            Calulator section (actions/steps to target level, materials needed
            to level up, ...)
          </li>
          <li>Steps to full inventory estimation</li>
        </ul>
      </section>
    </details>
    <details>
      <summary>Credits & Thanks</summary>
      <section class="about-content">
        <p>Developed and maintained by fala</p>
        <p>
          Special thanks to Arky for creating the original Walkscape Activity
          Sheet, which inspired this project.
        </p>
        <p>
          Thanks to Schamppu and the rest of the Not A Cult team for creating
          such an engaging and fun game.
        </p>
        <p>
          Thanks to the people who helped me test the tool and provided valuable
          feedback: Bonez565, Bassos, floursifter, Igno & Numismaster
        </p>
      </section>
    </details>
  </div>
</template>

<style scoped lang="scss">
.about-page {
  display: flex;
  flex-direction: column;
  gap: $lg;

  padding: $xlg;

  .about-content {
    display: flex;
    flex-direction: column;
    gap: $md;

    ul {
      list-style-type: disc;
      padding-left: $md;

      li {
        text-align: left;
      }
    }
  }
}

.back-btn-wrapper {
  align-self: flex-start;
  margin-bottom: $xlg;

  .back-btn {
    cursor: pointer;

    &.active {
      opacity: 1;
      font-weight: bold;
      border-bottom: 2px solid $txPrimary;
    }
    &:hover {
      opacity: 1;
      text-decoration: underline;
    }
  }
}
</style>
