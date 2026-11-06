const nicknames = require('../JS/nicknames');

const AVATARS = ['Personagem.png', 'personagem2.png', 'personagem3.png', 'personagem4.png'];
const LEGACY_NICKNAME = 'Aventureiro das nuvens';

// Historical save ids can differ from account ids, and a repaired account can
// have more than one save. Rank each existing account once, by its best score.
function scorePipeline(userCollection) {
    return [
        { $match: { bonusHighScore: { $type: 'number', $gt: 0, $lte: 1000000, $mod: [1, 0] } } },
        { $group: { _id: '$userId', score: { $max: '$bonusHighScore' } } },
        {
            $lookup: {
                from: userCollection,
                let: { accountId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$accountId'] } } },
                    { $project: { nickname: 1, avatar: 1 } }
                ],
                as: 'player'
            }
        },
        { $unwind: '$player' }
    ];
}

function publicPlayers(rows) {
    let previousScore, position;
    return rows.map((row, index) => {
        if (row.score !== previousScore) position = index + 1;
        previousScore = row.score;
        return {
            position,
            // Old accounts allowed arbitrary text. Never publish a possible
            // real name or another personal field in the public leaderboard.
            nickname: nicknames.valido(row.nickname) ? row.nickname : LEGACY_NICKNAME,
            avatar: AVATARS.find(avatar => typeof row.avatar === 'string' && avatar.toLowerCase() === row.avatar.toLowerCase()) || AVATARS[0],
            score: row.score
        };
    });
}

async function getRanking(SaveData, User) {
    const [result = {}] = await SaveData.aggregate([
        ...scorePipeline(User.collection.name),
        {
            $facet: {
                players: [
                    { $sort: { score: -1, _id: 1 } },
                    { $limit: 10 },
                    { $project: { _id: 0, nickname: '$player.nickname', avatar: '$player.avatar', score: 1 } }
                ],
                totals: [{ $count: 'count' }]
            }
        }
    ]);
    return { players: publicPlayers(result.players || []), totalPlayers: result.totals?.[0]?.count || 0 };
}

function personalRanking(result = {}) {
    const score = result.personal?.[0]?.score || 0;
    const totalPlayers = (result.scores || []).reduce((total, group) => total + group.count, 0);
    const ahead = (result.scores || []).reduce((total, group) => total + (group._id > score ? group.count : 0), 0);
    return { position: score > 0 ? ahead + 1 : null, score, totalPlayers };
}

async function getPlayerRanking(SaveData, User, userId) {
    const [result] = await SaveData.aggregate([
        ...scorePipeline(User.collection.name),
        {
            $facet: {
                personal: [{ $match: { _id: userId } }, { $project: { _id: 0, score: 1 } }],
                // Counts and the personal score come from the same snapshot.
                // Grouping by score avoids transferring every player's data.
                scores: [{ $group: { _id: '$score', count: { $sum: 1 } } }]
            }
        }
    ]);
    return personalRanking(result);
}

module.exports = { getRanking, getPlayerRanking, publicPlayers, personalRanking, scorePipeline };
