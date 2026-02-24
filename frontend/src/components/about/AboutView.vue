<script setup lang="ts">
defineEmits(["back", "privacy-policy"]);
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
          really appreciate it - you can support me on
          <a
            href="https://buymeacoffee.com/juhanaauttg"
            target="_blank"
            rel="noopener noreferrer"
            >Buy Me a Coffee</a
          >
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
          <li>Pets not in game data import</li>
          <li>Multiple issues with how rings are handled</li>
        </ul>
        <h3>Planned features</h3>
        <ul>
          <li>Steps to full inventory estimation</li>
          <li>Adding custom data (items, activities)</li>
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

    <div class="footer-links">
      <button class="privacy-link" @click="$emit('privacy-policy')">Privacy Policy</button>
    </div>
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

.footer-links {
  margin-top: $sm;

  .privacy-link {
    cursor: pointer;
    opacity: 0.7;
    font-size: 0.9em;
    text-decoration: underline;

    &:hover {
      opacity: 1;
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
