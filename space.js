/**
 * Star field
 */

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
canvas.setAttribute('tabindex', 1);

/**
 * Paint stars in the canvas
 * @param  {[array]} stars array of stars produces by observable.
 */
function paintStars(stars){
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  stars.forEach(function(star){
    ctx.fillRect(star.x, star.y, star.size, star.size);
  });
}

var SPEED = 40;
var STAR_NUMBER = 250;
var $star = Rx.Observable
  .range(1, STAR_NUMBER)
  .map(function(){
    return {
      x: parseInt(Math.random() * canvas.width),
      y: parseInt(Math.random() * canvas.height),
      size: Math.random() * 3 + 1
    };
  })
  .toArray()
  .flatMap(function(starArray){
    return Rx.Observable
      .interval(SPEED)
      .map(function(){
        starArray
          .forEach(function(star){
            if(star.y >= canvas.height){
              star.y = 0; // Restart star at the top of the screen.
            }
            star.y += 3; // Move star
          });
        return starArray;
      })
  });

/**
 * End star field
 */

function isVisible(obj){
 return obj.x > -40 && obj.x < canvas.width + 40 && obj.y > -40 && obj.y < canvas.height + 40;
}

function collision(target1, target2){
  return (target1.x > target2.x - 20 && target1.x < target2.x + 20) && (target1.y > target2.y - 20 && target1.y < target2.y + 20);
}

function gameOver(ship, enemies){
  return enemies.some(function(enemy){
    if(collision(ship, enemy)){
      return true;
    }

    return enemy.shots.some(function(shot){
      return collision(ship, shot);
    })
  })
}

 /**
  * Enemies
  */

 var ENEMY_FREQ = 1500;
 var ENEMY_SHOT_FREQ = 750;
 var SHOOTING_SPEED = 15;
 var $enemies = Rx.Observable
   .interval(ENEMY_FREQ)
   .scan(function(enemyArray){
     var enemy = {
       x: parseInt(Math.random() * canvas.width),
       y: -30,
       shots: []
     };
     Rx.Observable
      .interval(ENEMY_SHOT_FREQ)
      .subscribe(function(){
        if(!enemy.isDead){
          enemy.shots.push({
            x: enemy.x,
            y: enemy.y
          });
        }
        enemy.shots = enemy.shots.filter(isVisible);
      });

     enemyArray.push(enemy);
     return enemyArray.filter(isVisible);
   }, [])
   .filter(function(enemy){
     return !(enemy.isDead && enemy.shots.lenght === 0);
   })

function getRandomInt(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function paintEnemies(enemies){
  enemies.forEach(function(enemy){
    enemy.y += 5;
    enemy.x += getRandomInt(-15, 15);
    if(!enemy.isDead){
        drawTriangle(enemy.x, enemy.y, 20, '#00ff00', 'down');
    }
    enemy.shots.forEach(function(shot){
      shot.y += SHOOTING_SPEED;
      drawTriangle(shot.x, shot.y, 5, '#00FFFF', 'down');
    });
  });
}

/**
* End Enemies
*/

/**
 * Hero
 */

 var HERO_Y = canvas.height - 30;
 var $mouseMove = Rx.Observable.fromEvent(canvas, 'mousemove');
 var $spaceShip = $mouseMove
   .map(function(event){
     return {
       x: event.clientX,
       y: HERO_Y
     };
   })
   .startWith({
     x: canvas.width / 2,
     y: HERO_Y
   });

/**
* score
*/
function paintScore(score){
 ctx.fillStyle = "#FFFFFF";
 ctx.font = 'bold 26px sans-serif';
 ctx.fillText("Score: " + score, 40, 43);
}
var SCORE_POINTS = 10;
var ScoreSubject = new Rx.Subject();
var $score = ScoreSubject
  .scan(function (prev, cur) {
    return prev + cur;
  }, 0)
  .startWith(0)

var FIRE_SPEED = 200;
var $playerFiring = Rx.Observable
 .merge(Rx.Observable.fromEvent(canvas, 'click'), Rx.Observable.fromEvent(canvas, 'keydown'))
 .filter(function(evt){
   return evt.keyCode === 32;
 })
 .sample(FIRE_SPEED)
 .timestamp()

var $shots = Rx.Observable
 .combineLatest(
   $playerFiring,
   $spaceShip,
   function(shotEvents, spaceShip){
     return {
       x: spaceShip.x,
       timestamp: shotEvents.timestamp
     };
   }
 )
 .distinctUntilChanged(function(shot){
   return shot.timestamp;
 })
 .scan(function(shotArray, shot){
   var shotE = {
     x: shot.x,
     y: HERO_Y
   };
   shotArray.push(shotE);
   return shotArray;
 }, []);

function paintHeroShots(heroShots, enemies){
  heroShots.forEach(function(shot, i){
    for(var l=0; l < enemies.length; l++){
      var enemy = enemies[l];
      if(!enemy.isDead && collision(shot, enemy)){
        ScoreSubject.onNext(SCORE_POINTS);
        enemy.isDead = true;
        shot.x = shot.y = -100;
        break;
      }
    }
    shot.y -= SHOOTING_SPEED;
    drawTriangle(shot.x, shot.y, 5, '#ffff00', 'up');
  });
}

/**
* End hero shoots
*/

/**
 * Hero
 */

function drawTriangle(x, y, width, color, direction){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.lineTo(x, direction === 'up' ? y - width : y + width);
  ctx.lineTo(x + width, y);
  ctx.lineTo(x - width, y);
  ctx.fill();
}

function paintSpaceShip(x, y){
  drawTriangle(x, y, 20, '#ff0000', 'up');
}

function renderScene(actors){
  paintStars(actors.stars);
  paintSpaceShip(actors.spaceship.x, actors.spaceship.y);
  paintEnemies(actors.enemies);
  paintHeroShots(actors.heroShots, actors.enemies);
  paintScore(actors.score);
}

var $game = Rx.Observable
  .combineLatest($star, $spaceShip, $enemies, $shots, $score, function(stars, spaceship, enemies, shotsH, score){
    return {
      stars: stars,
      spaceship: spaceship,
      enemies: enemies,
      heroShots: shotsH,
      score: score
    };
  })
  .sample(SPEED)
  .takeWhile(function(actors){
    return gameOver(actors.spaceship, actors.enemies) === false;
  })
  .subscribe(renderScene);

/**
 * End hero
 */
