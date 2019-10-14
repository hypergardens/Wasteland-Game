function HpToRadiusSystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['hp']);
        for (let entity of entities) {
            entity.r = sqrt(entity.hp.curr / PI) * 10 + 10;
        }
    }
}

function TickSystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['gameState']);
        for (let entity of entities) {
            entity.gameState.tick += 1;
            fill(255);
            textSize(20);
            noStroke();
            text(entity.gameState.tick, 20, 20);
        }
    }
}

function EnemyFollowsPlayerSystem() {
    function moveTowards(objA, objB, amount) {
        let distX = objB.pos.x - objA.pos.x,
            distY = objB.pos.y - objA.pos.y,
            angle = atan2(distY, distX);

        objA.pos.x += amount * cos(angle);
        objA.pos.y += amount * sin(angle);
    }

    this.process = function(ecs) {
        let entities = ecs.filterEntities(['TYPE_ENEMY']);
        let players = ecs.filterEntities(['TYPE_PLAYER']);
        for (let entity of entities) {
            // TODO: change to use velocity
            moveTowards(entity, players[0], entity.followAmount);
        }
    }
}

function VelocitySystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['pos', 'vel']);
        
        for (let entity of entities) {
            entity.pos.x += entity.vel.x;
            entity.pos.y += entity.vel.y;
            if (entity.friction) {
                entity.vel.x *= entity.friction;
                entity.vel.y *= entity.friction;
            }
        }
    }
}

function PlayerControlSystem() {
    // // player controls
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['TYPE_PLAYER']);
        let reticle = ecs.filterEntities(['TYPE_RETICLE'])[0];
        for (let player of entities) {
            let angle = atan2(reticle.pos.y - player.pos.y, reticle.pos.x - player.pos.x);
            if (dist(reticle.pos.x, reticle.pos.y, player.pos.x, player.pos.y) > 3) {
                player.pos.x += player.speed * cos(angle);
                player.pos.y += player.speed * sin(angle);
            } else {
                player.pos.x = reticle.pos.x;
                player.pos.y = reticle.pos.y;
            }
        }
    }
}

function LifetimeSystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['lifetime']);
        // bullet lifetime
        for (let entity of entities) {
            entity.lifetime -= 1;
            if (entity.lifetime <= 0){
                entity.dead = true;
                ecs.updateEntity(entity);
            } 
                
        }
    }
}

function CleanupSystem() {
    this.process = function(ecs) {
        // clean up empty squads
        let squads = ecs.filterEntities(['containsUnits']);
        for (let squad of squads) {
            let units = getUnits(ecs, squad.guid);
            if (units.length === 0) {
                squad.dead = true;
                ecs.updateEntity(squadA);
                continue;
            }
        }
        
        let entities = ecs.filterEntities(['dead']);
        for (let entity of entities) {
            if (entity.dead === true){
                ecs.removeEntity(entity);
                let tick = ecs.filterEntities(['gameState'])[0].gameState.tick;
                // console.log('entity', entity.guid, 'removed on tick', tick);
            }
        }
    }
}

function DrawingSystem() {
    function customText(_str, x, y, size, _fill, _stroke) {
        function monoOffset(n) {
            return 13 / 40 * n;
        }
        textFont('Courier New');
        stroke(_stroke || [0, 0]);
        fill(_fill);
        textSize(size);
        text(_str, x - monoOffset(size), y);
    }
                    
    this.process = function(ecs) {
        let circleRenderEntities = ecs.filterEntities(['pos', 'r', 'fill']);
        
        for (let entity of circleRenderEntities) {
            fill(...entity.fill);
            if (entity.stroke)
                stroke(...entity.stroke)
            else 
                stroke(0);
            
            circle(entity.pos.x, entity.pos.y, entity.r * 2);
        }

        let textRenderEntities = ecs.filterEntities(['pos', 'textRender']);
        for (let entity of textRenderEntities) {
            // textRender: {
            //     x: null, y: null,
            //     size: size || 20,
            //     fill: fill || [255],
            //     string: string || '?',
            // },
            let {size, fill, string} = entity.textRender;
            let {x, y} = entity.pos;
            customText(string, x, y, size, fill, null);
        }
    }
}

function CollisionSystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['pos', 'r']);
        for (let entityA of entities) {
            entityA.collisions = new Set();
            for (let entityB of entities) {
                if (entityA !== entityB && collide(entityA, entityB)) {
                    entityA.collisions.add(entityB.guid);
                }
                // setText(30, 255);
                // text([...entityA.collisions].join(','), 
                //     entityA.pos.x, entityA.pos.y - entityA.r);
            }
        }
    }
}

function ReticleSystem() {
    this.process = function(ecs) {
        // reticle
        for (let reticle of ecs.filterEntities(['TYPE_RETICLE'])) {
            if (mouseIsPressed) {
                reticle.pos.x = mouseX;
                reticle.pos.y = mouseY;
            }
        }
    }
}

function OddSystem() {
    this.process = function(ecs) {
        // reticle
        for (let oddity of ecs.filterEntities(['x'])) {
            console.log(oddity)
        }
    }
}


function ExplosionSystem() {
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['TYPE_EXPLOSION']);
        // { pos: {x,y}, r, n, fill, speed, lifetime }
        for(let entity of entities) {
            entity.dead = true;
            ecs.updateEntity(entity);
            
            for(let i=0; i<entity.n; i++) {
                ecs.addEntity(
                    makeParticle(
                        entity.pos.x,
                        entity.pos.y, 
                        random(0, TAU), 
                        entity.speed * random(0.8, 1.2),
                        entity.r,
                        entity.lifetime,
                        entity.fill,
                        entity.stroke))
            }
        }
    }
}

function PositionUnitsSystem() {
    function ringCapacity(ring) {
        if (ring === 0) return 1;
        else return ring * 6;
    }
    function getRing(n) {
        // 0 1 7 18
        if (n === 0) return 0;
        let ring = 0;
        while (n > 0) {
            ring += 1;
            n -= ring * 6;
        }
        return ring;
    }
    this.ringDict = {
        ringOf: [],
        ringCapacity: [],
        ringBounds: [],
        maxCalculation: 0
    }
    this.init = function(n) {
        let dict = this.ringDict;

        dict.ringOf[0] = 0;
        dict.ringCapacity[0] = 1;
        dict.ringBounds[0] = [0, 0];

        for (let i=1; i<n; i++) {
            let ring = getRing(i);
            dict.ringOf[i] = ring;
            if (ring > dict.ringOf[i-1]) {
                firstInRing = i;
                dict.ringBounds[ring] = [i, i + ringCapacity(ring) - 1];
            }
        }
        dict.maxCalculation = n;
    }


    this.process = function(ecs) {
        let squads = ecs.filterEntities(['containsUnits']);

        for (let squad of squads) {
            let myUnits = getUnits(ecs, squad.guid);
            if (myUnits.length > this.ringDict.maxCalculation) {
                this.init(myUnits.length + 100);
            } 
            let maxRing = max(1, getRing(myUnits.length - 1));
            // render its units
            for (let i=0; i<myUnits.length; i++) {
                let ring = this.ringDict.ringOf[i];
                let ringBounds = this.ringDict.ringBounds[ring];
                let angle = map(i, ringBounds[0], ringBounds[1] + 1, 0, TAU);
                let unit = myUnits[i];
                // let offset = ring * squad.r / sqrt(myUnits.length) * 2;
                let offset = ring / maxRing * squad.r * 0.8;
                let unitX = squad.pos.x + cos(angle) * offset,
                    unitY = squad.pos.y + sin(angle) * offset;

                unit.pos.x = unitX;
                unit.pos.y = unitY;
            }
        }
    }
}

function AsciiAnimSystem() {
    // this.example = {
    //     asciiAnim: {
    //         text,
    //         initialState: {
    //             pos: {x, y},
    //             size, fill,
    //         },
    //         finalState: {
    //             pos: {x, y},
    //             size, fill,
    //         },
    //         progress: 0,
    //         rate: 0.1,
    //     }
    // }
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['asciiAnim']);
        for (let entity of entities) {
            let anim = entity.asciiAnim;
            let { initialState, finalState } = anim;
            let x = map(anim.progress, 0, 1, initialState.pos.x, finalState.pos.x);
            let y = map(anim.progress, 0, 1, initialState.pos.y, finalState.pos.y);
            let size = map(anim.progress, 0, 1, initialState.size, finalState.size);
            fill(initialState.fill);
            
            noStroke();
            textSize(size);
            text(anim.text, x, y);

            anim.progress += anim.rate;
            if (anim.progress >= 1) {
                anim.progress = 1;
                entity.dead = true;
                ecs.updateEntity(entity);
            }    
        }
    }
}

function BarSystem() {
    function bar(x, y, currv, minv, maxv){

    }
    this.process = function(ecs) {
        let entities = ecs.filterEntities(['stats']);
        for (let entity of entities) { 
            let hp = entity.stats.hp;
            let maxHp = entity.stats.maxHp;
            let cooldown = entity.stats.cooldown;
            let maxCooldown = entity.stats.maxCooldown;
            noStroke();
            // cooldown bar
            fill(200, 200, 0);
            rect(entity.pos.x - 6, entity.pos.y + 9, map(cooldown.base, 0, maxCooldown.base, 0, 10), 4)
            // hp bar
            fill(200, 0, 0);
            rect(entity.pos.x - 6, entity.pos.y + 6, 10, 4);
            fill(0, 200, 0);
            rect(entity.pos.x - 6, entity.pos.y + 6, map(hp.base, 0, maxHp.curr, 0, 10), 4);
        }
    }
}

function UnitUpdateSystem() {
    this.process = function(ecs) {
        // unit updates
        let units = ecs.filterEntities(['stats']);
        for (let unit of units) {
            setText(20, [255]);
            // text(unit.guid, unit.pos.x - 5, unit.pos.y - 20);
            unit.stats.cooldown.base = max(unit.stats.cooldown.base - 1, 0);
            if (unit.stats.hp.base <= 0) {
                unit.dead = true;
                ecs.updateEntity(unit);
            }
        }
    }
}

function ApplyModsSystem() {
    let mulMod = makeMulMod('attack', 2);
    let addMod = {
        stat: 'attack',
        prio: 1,
        change: val => max(4, val - 10),
    }
    let exampleModField = makeModField();
    this.process = function(ecs) {
        // every unit container in contact with a mod applier
        let squads = ecs.filterEntities(['containsUnits']);
        let modFields = ecs.filterEntities(['appliesMods']);

        // reset mods
        let moddables = ecs.filterEntities(['mods']);
        for (let moddable of moddables) {
            moddable.mods = [];
        }

        // apply mods
        for (let squad of squads) {
            for (let modField of modFields) {
                if (collide(squad, modField)) {
                    let mods = modField.appliesMods;
                    let units = getUnits(ecs, squad.guid);
                    for (let unit of units) {
                        unit.mods.push(...mods);
                    }
                    for (let unit of units) {
                        setText(20, 255);
                        text(unit.mods.length + '!', unit.pos.x - 40, unit.pos.y);
                    }
                }
            }
        }
        let units = ecs.filterEntities(['stats']);
    }
}
function CalculateStatsSystem () {
    this.process = function(ecs) {
        let units = ecs.filterEntities(['stats']);
        for (let unit of units) {
            let { stats } = unit;
            let statNames = props(stats);
            for (let stat of statNames) {
                stats[stat].curr = stats[stat].base;
            }
            unit.mods.sort(mod => mod.prio);
            for (let mod of unit.mods) {
                let { stat, change } = mod;
                stats[stat].curr = change(stats[stat].curr);
            }
        }
    }
}

function CombatSystem() {
    this.process = function(ecs) {
        let squads = ecs.filterEntities(['containsUnits']);
        let units = ecs.filterEntities(['stats']);

        // determine dead squads and conflict situations
        for (let squadA of squads) {
            
            setText(30, [200, 200, 0]);
            // text("id:" + squadA.guid, squadA.pos.x - 20, squadA.pos.y + squadA.r + 20);

            // collisions to determine current combat situation
            // TODO: use collisions from system
            squadA.lastCombat = squadA.currentCombat;
            let enemySquads = new Set(squads
                .filter(s => s !== squadA)
                .map(s => s.guid));

            squadA.currentCombat = intersection(squadA.collisions, enemySquads);

            setText(30, 255);
            text([...squadA.currentCombat].join(','), 
                squadA.pos.x, squadA.pos.y - squadA.r - 30);

            // new contact situation, make units go on initial cooldown
            if (squadA.currentCombat.size > 0 && 
                !equalSets(squadA.lastCombat, squadA.currentCombat) &&
                isSuperset(squadA.currentCombat, squadA.lastCombat)) {
                ecs.addEntity(makeAsciiProjectile([...squadA.currentCombat].join(','),
                                squadA.pos.x, squadA.pos.y,
                                squadA.pos.x, squadA.pos.y - 30,
                                0.05, 50,
                                [255, 255, 100]
                            ))
                // units go on initial cooldown
                for (let unit of units) {
                    unit.stats.cooldown.base = Math.random() * unit.stats.maxCooldown.base;
                }
            }

        }

        // make each unit off cd act
        for (let squadA of squads) {
            let { currentCombat } = squadA;
            if (currentCombat.size === 0) continue;
            let targets = units.filter(u => currentCombat.has(u.squadGuid));
            let readyUnits = units.filter(u => u.squadGuid === squadA.guid &&
                                               u.stats.cooldown.base === 0);
                                               
            // let targetIds = targets.map(t => t.guid);
            // display target ids
            // setText(50, [0, 255, 255]);
            // text([...targetIds].join(','), squadA.pos.x - squadA.r, squadA.pos.y - squadA.r);
            
            for (let unit of readyUnits) {
                let ux = unit.pos.x,
                    uy = unit.pos.y;
                // let target = pickFrom(targets);
                // let target = targets.sort(unit => -unit.stats.attack)[0];
                // let wTargets = targets -->[ [{},4], [{}, 2] ];
                // build weight list
                let wTargets = [];
                let wSum = 0;
                for (let target of targets) {
                    let weight = 1 / (target.stats.hp.base / target.stats.maxHp.curr);
                    // ecs.addEntity(makeAsciiProjectile(weight, 
                    //     target.pos.x, target.pos.y + 10,
                    //     target.pos.x, target.pos.y + 10, 0.5, 16, [255]));
                    // rect(target.pos.x, target.pos.y - 40, weight * 5, 4);
                    wTargets.push([weight, target]);
                    wSum += weight;
                }
                let wRand = Math.random() * wSum;
                let i=-1;
                while (wRand > 0) {
                    i += 1;
                    wRand -= wTargets[i][0];
                }
                // HACK: nobody to target, move along
                if (i === -1) continue;

                let target = wTargets[i][1];

                // ecs.addEntity(makeAsciiProjectile(target.guid, 
                //     unit.pos.x, unit.pos.y,
                //     unit.pos.x + 20, unit.pos.y, 0.05, 20, [255]));

                let ability = {
                    apply: function(unit, target) {
                        let attack = {
                            damage: 1,
                            cooldown: 1,
                        };
                        // if (Math.random() > 0.3){
                        //     attack = {
                        //         damage: 2,
                        //         cooldown: 1.5
                        //     }
                        // };
                        let damage = unit.stats.attack.curr * attack.damage;
                        let cooldown = unit.stats.maxCooldown.base * attack.cooldown;
                        unit.stats.cooldown.base = cooldown;
                        target.stats.hp.base -= damage;
                        ecs.addEntity(makeAsciiProjectile(round(damage), ux, uy, target.pos.x, target.pos.y, 0.05, damage + 10, [255, 255, 100, 200]));
                    }
                }
                ability.apply(unit, target);
            }
        }
    }
}