import { Game } from './game.js';

// ===== ECONOMY =====
export const Economy = {
  earn(amount, msg) {
    Game.player.money += amount;
    UI.updateMoney();
    UI.notify(`+${amount} 💰 ${msg||''}`);
  },
  spend(amount) {
    if (Game.player.money < amount) return false;
    Game.player.money -= amount;
    UI.updateMoney();
    return true;
  }
};
