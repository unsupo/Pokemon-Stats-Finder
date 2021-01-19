/*
Calc Stats
Nmod = 1.1 for boosting, 0.9 for reducing and 1 for neutral

HP =  ((Base * 2 + IV + (EV/4)) * level / 100 + 10 + level
Stat = ((Base * 2 + IV + (EV/4)) * level / 100 + 5 ) * Nmod

*/
const calcHP = (base, iv, ev, level) => (base*2+iv+ev/4.)*level/100.+10+level;
const calcStat = (base, iv, ev, level, nMod = 1) => Math.round(((base*2+iv+ev/4.)*level/100.+5)*nMod);

const names = ["hp","atk","def","spa","spd","spe"];

class StatFinder {
    EV_TOTAL = 508;
    EV_MAX = 252;
    IV_MAX = 31;
    NATURE = [1.1,1,.9];
    endStats;
    baseStats;
    level;
    evs;
    ivs;
    nature;
    constructor(level = 100, baseStats = [0], endStats = [0]) {
        this.level = level;
        this.baseStats = baseStats;
        this.endStats = endStats;
        if(level < 1 || level > 100)
            throw new Exception("Level Must be between 1 and 100 not: "+level);
        if(this.baseStats.length !== names.length)
            throw new Exception("There must be "+names.length+" base stats not: "+this.baseStats);
        if(this.endStats.length !== names.length)
            throw new Exception("There must be "+names.length+" base stats not: "+this.endStats);
    }

    calculate() {
        // return this._calculate([0,0,0,0,0,0],[0,0,0,0,0,0],0, 0, -1, -1, this.EV_TOTAL);
        /*
        guess iv
        hp
        ev = 4*((s-l-10)*100/level-2b-iv)
        others guess nature too
        ev=4*((s/n-5)*100/l-2b-iv)
        check that ev<=252 and an integer
         */
        const getEvHp = (base,end,iv,level) => 4*((end-level-10)*100/level-2*base-iv);
        const getEvStat =(base,end,iv,level,nMod) => Math.ceil(4*((end/nMod-5)*100/level-2*base-iv));

        const evs = [0,0,0,0,0,0];
        const ivs = [0,0,0,0,0,0];
        const nature = [1,1,1,1,1,1];
        let evTotal = this.EV_TOTAL;
        let isUsedBeneficial = false;
        let isUsedNegative = false;
        for(let stat = 0; stat < names.length; stat++) {
            for (let iv = 31; iv >= 0; iv--) {
                let ev;
                let isBenefit = false;
                if(stat === 0)
                    ev = getEvHp(this.baseStats[stat],this.endStats[stat],iv,this.level);
                else {
                    ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level, this.NATURE[1]);
                    if (ev > 252) {
                        ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level, this.NATURE[0]);
                        nature[stat]=this.NATURE[0]; // found a stat that needs beneficial nature need to recalculate everything
                        isUsedBeneficial = true;
                        isBenefit = true;
                    }
                    if(ev < 0 && iv === 0){
                        ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level, this.NATURE[2]);
                        nature[stat]=this.NATURE[2]; // found a stat that needs beneficial nature need to recalculate everything
                        isUsedNegative = true;
                        if (ev < 0)
                            ev = 0; // -3,-2,-1 are all = 0
                    }
                }
                if(ev > 252 || ev > evTotal || ev < -3)
                    continue;
                evTotal-=ev;
                ivs[stat]=iv;
                evs[stat]=ev;
                break;
            }
        }
        if((isUsedNegative && !isUsedBeneficial) || (!isUsedNegative && isUsedBeneficial)) {
            // TODO this means i used a beneficial nature without using a negative or vice versa
            // could be anything except for the stats with both 31 iv and 252 ev if they match
            console.log("NOT IMPLEMENTED");
            // do another pass but only change ivs and ignore the beneficial stat
        }

        // this.baseStats.forEach((v,i)=>console.log(v,i));
        // this.baseStats.forEach((s,i)=>console.log((i===0?calcHP(s,ivs[i],evs[i],this.level):calcStat(s,ivs[i],evs[i],this.level,nature[i]))+" --- "+this.endStats[i]+" "+ivs[i]+" "+evs[i]+" "+nature[i]))
        return {
            ivs: ivs,
            evs: evs,
            natures: nature
        };
    }
    isValid(ivs,evs,nature){
        if(!this.isStatSame(ivs,evs,nature))
            return false;
        if((nature.indexOf(this.NATURE[0]) > -1 && nature.indexOf(this.NATURE[2]) < 0) ||
            (nature.indexOf(this.NATURE[0]) < 0 && nature.indexOf(this.NATURE[2]) > -1))
            return false;
        return true;
    }
    isStatSame(ivs,evs,nature,debug=false){
        for(let stat = 0; stat < names.length; stat++) {
            let c;
            if (stat === 0)
                c = calcHP(this.baseStats[stat], ivs[stat], evs[stat], this.level);
            else
                c = calcStat(this.baseStats[stat], ivs[stat], evs[stat], this.level, nature[stat]);
            if(debug)
                console.log(c+" --- "+this.endStats[stat]);
            if(c !== this.endStats[stat])
                return false;
        }
        return true;
    }


    get EVs(){
        if(!this.evs)
            this.calculate();
        return this.evs;
    }
    get IVs(){
        if(!this.ivs)
            this.calculate();
        return this.ivs;
    }
    get nature(){
        if(!this.nature)
            this.calculate();
        return this.nature;
    }
}
const endStats = [271,279,280,153,157,293];
const baseStats = [65,90,122,58,75,84];
const level = 100;

const s = new StatFinder(level,baseStats,endStats);
const v = s.calculate();
console.log(v);
console.log(s.isValid(v.ivs,v.evs,v.natures,debug=true))