/*
Calc Stats
Nmod = 1.1 for boosting, 0.9 for reducing and 1 for neutral

HP =  ((Base * 2 + IV + (EV/4)) * level / 100 + 10 + level
Stat = ((Base * 2 + IV + (EV/4)) * level / 100 + 5 ) * Nmod

*/
const calcHP = (base, iv, ev, level) => (base*2+iv+ev/4.)*level/100.+10+level;
const calcStat = (base, iv, ev, level, nMod = 1) => Math.round(((base*2+iv+ev/4.)*level/100.+5)*nMod);

const names = ["hp","atk","def","spa","spd","spe"];

const natureValues = [
    ["hardy","lonely","adamant","naughty","brave"],
    ["bold","docile","impish","lax","relaxed"],
    ["modest","mild","bashful","rash","quiet"],
    ["calm","gentle","careful","quirky","sassy"],
    ["timid","hasty","jolly","naive","serious"]
];

class StatFinder {
    EV_TOTAL = 510;
    EV_MAX = 252;
    IV_MAX = 31;
    NATURE = [1.1,1,.9];
    endStats;
    baseStats;
    level;
    evs;
    ivs;
    nature;
    constructor(level = 100, baseStats = [0], endStats = [0], nature) {
        this.level = level;
        this.baseStats = baseStats;
        this.endStats = endStats;
        this.nature = nature ? nature.toLowerCase() : undefined;
        if(level < 1 || level > 100)
            throw new Exception("Level Must be between 1 and 100 not: "+level);
        if(this.baseStats.length !== names.length)
            throw new Exception("There must be "+names.length+" base stats not: "+this.baseStats);
        if(this.endStats.length !== names.length)
            throw new Exception("There must be "+names.length+" base stats not: "+this.endStats);
    }
    /*
        guess iv
        hp
        ev = 4*((s-l-10)*100/level-2b-iv)
        others guess nature too
        ev=4*((s/n-5)*100/l-2b-iv)
        check that ev<=252 and an integer
     */
    _calculateStats(_isUsedBeneficial, _isUsedNegative, _ignoreStats, _evTotal,findNegativeNature=false, findPositiveNature = false, forcePossitiveIndex, forceNegativeIndex, depth = 0){
        const getEvHp = (base,end,iv,level) => 4*((end-level-10)*100/level-2*base-iv);
        const getEvStat =(base,end,iv,level,nMod) => Math.ceil(4*((end/nMod-5)*100/level-2*base-iv));
        let evs = [-1,-1,-1,-1,-1,-1];
        let ivs = [-1,-1,-1,-1,-1,-1];
        let nature = [1,1,1,1,1,1];
        let evTotal = _evTotal ? _evTotal : this.EV_TOTAL;
        let isUsedBeneficial = _isUsedBeneficial ? _isUsedBeneficial : false;
        let isUsedNegative = _isUsedNegative ? _isUsedNegative : false;
        let ignoreStats = _ignoreStats ? _ignoreStats : [];
        const stats = [-1,-1,-1,-1,-1,-1];
        for(let stat = 0; stat < names.length; stat++) {
            if(ignoreStats.indexOf(stat) >= 0)
                continue;
            for (let iv = 31; iv >= 0; iv--) {
                let ev;
                let isBenefit = false;
                if(stat === 0)
                    ev = getEvHp(this.baseStats[stat],this.endStats[stat],iv,this.level);
                else {
                    ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level,
                        this.NATURE[forcePossitiveIndex && stat===forcePossitiveIndex?0: forceNegativeIndex && stat === forceNegativeIndex ? 2 :(findNegativeNature?2:findPositiveNature?0:1)]);
                    if(findNegativeNature || (forceNegativeIndex && stat === forceNegativeIndex)) {
                        nature[stat] = this.NATURE[2];
                        isUsedNegative = true;
                        ignoreStats.push(stat);
                    }else if(findPositiveNature || (forcePossitiveIndex && stat===forcePossitiveIndex)){
                        nature[stat] = this.NATURE[0];
                        isUsedBeneficial = true;
                        ignoreStats.push(stat);
                    }
                    if (ev > 252) {
                        ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level, this.NATURE[0]);
                        nature[stat]=this.NATURE[0]; // found a stat that needs beneficial nature need to recalculate everything
                        isUsedBeneficial = true;
                        isBenefit = true;
                        ignoreStats.push(stat);
                    }
                    if(ev < 0 && iv === 0){
                        ev = getEvStat(this.baseStats[stat], this.endStats[stat], iv, this.level, this.NATURE[2]);
                        nature[stat]=this.NATURE[2]; // found a stat that needs beneficial nature need to recalculate everything
                        isUsedNegative = true;
                        ignoreStats.push(stat);
                        if (ev < 0)
                            ev = 0; // -3,-2,-1 are all = 0
                    }
                }
                if(ev > evTotal)
                    break; // this means we've run out of evs the evs needed so far are wrong
                if(ev > 252 || ev < -3)
                    continue;
                if(iv === 31 && ev === 252)
                    ignoreStats.push(stat);
                ev = ev < 0 ? 0 : ev;
                evTotal-=ev;
                ivs[stat]=iv;
                evs[stat]=ev;
                stats[stat]=stat === 0 ? calcHP(this.baseStats[stat],iv,ev,this.level) : calcStat(this.baseStats[stat],iv,ev,this.level,nature[stat]);
                break;
            }
            if(ivs[stat] === -1)
                break;
        }
        if(ignoreStats.indexOf(0) < 0)
            ignoreStats.push(0);
        if((isUsedNegative && !isUsedBeneficial) || (!isUsedNegative && isUsedBeneficial)) {
            // do another pass but only change ivs and ignore the beneficial stat
            let nEvTotal = evTotal;
            evs.filter((a,i)=>ignoreStats.indexOf(i) < 0).forEach(a=>nEvTotal+=a);
            const possibleNegative = this._calculateStats(isUsedBeneficial, isUsedNegative, ignoreStats,nEvTotal, true,undefined,undefined,undefined,depth+1);
            for(let i = 0; i<possibleNegative.ivs.length; i++)
                if(possibleNegative.ivs[i] >= 0 && possibleNegative.natures[i] === this.NATURE[2]){
                    const values = this._calculateStats(undefined,undefined,undefined,undefined,false,false,nature.indexOf(this.NATURE[0]),i,depth+1);
                    if(values.ivs.indexOf(-1) < 0) {
                        nature[i]=this.NATURE[2];
                        ivs[i]=possibleNegative.ivs[i];
                        evs[i]=possibleNegative.evs[i];
                        break
                    }
                }
        }
        if(depth === 0 && stats.slice(1).indexOf(-1) >= 0){
            // this means one stat couldn't be found so force a stat to be beneficial
            for(let stat = 1; stat < stats.length; stat++){
                const values = this._calculateStats(undefined,undefined,undefined,undefined,false,false,stat,undefined,depth+1);
                if(values.ivs.indexOf(-1) < 0 && values.natures.indexOf(this.NATURE[2]) >= 0){
                    nature = values.natures;
                    ivs = values.ivs;
                    evs = values.evs;
                    break
                }
            }
        }
        return {ivs: ivs, evs: evs, natures: nature, natureName: this.getNature(nature)};
    }

    calculate() {
        const natureIndexes = this.getNatureIndexes(this.nature);
        return this._calculateStats(undefined,undefined,undefined,undefined,false,false,
            natureIndexes ? natureIndexes[0]+1 : undefined,natureIndexes ? natureIndexes[1] +1: undefined);
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

    getNatureIndexes(nature) {
        if(!nature)
            return undefined;
        for(let i = 0; i<natureValues.length; i++)
            for(let j = 0; j<natureValues[i].length; j++)
                if(nature === natureValues[i][j])
                    return [i,j];
        return undefined; //usually this happens due to a misspelling of nature
    }

    getNature(natures){
        if(natures.indexOf(this.NATURE[0]) < 0)
            return "Serious";
        const plusStat = natures.indexOf(this.NATURE[0])-1;
        const minusStat = natures.indexOf(this.NATURE[2])-1;
        return natureValues[plusStat][minusStat];
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
// const endStats = [343,162,251,175,210,148];
// const baseStats = [100,50,80,60,80,50];
// const level = 100;
//
// const s = new StatFinder(level,baseStats,endStats,"bold");
// const v = s.calculate();
// console.log(v);
// for(let i = 0; i<names.length; i++)
//     console.log(endStats[i]+" ---- "+(i===0?calcHP(baseStats[i],v.ivs[i],v.evs[i],level):calcStat(baseStats[i],v.ivs[i],v.evs[i],level,v.natures[i])))
// console.log(s.isValid(v.ivs,v.evs,v.natures,debug=true))
// console.log(new StatFinder(100,[100,50,80,60,80,50],[343,162,251,175,210,148]).calculate())