import websockets
import asyncio
import traceback
import random
from concurrent.futures import TimeoutError as ConnectionTimeoutError


clients= {}
games = {}
d_games = [] #games with druid waiting for necromancer
n_games = [] #games with necromancer waiting for druid


async def handle_message(websocket):
    global clients, games
    playerId = None

    async for message in websocket:
        data = translate_to_text(message)
        print(data)
        if data['type'] == 'join' :
            gameId = data['gameId']
            playerType = data['playerType']

            if gameId not in games:
                games[gameId] = {
                    'players': {},
                    'websockets':{}, 
                    'turn': 'd'
                    }

            if gameId == None:
                if d_games and playerType == 'd':
                    gameId = d_games.pop(0)

                elif n_games and playerType=='n':
                    gameId = n_games.pop(0)

                else:
                    while True:
                        gameId = "generated" + str(random.randint(1, 10000))
                        if gameId not in games:
                            break
                    
                    games[gameId] = {
                    'players': {},
                    'websockets':{}, 
                    'turn': 'd'
                    }

                    if playerType == 'd':
                        d_games.append(gameId)
                    else:
                        n_games.append(gameId)
            
            if playerType in games[gameId]["websockets"].values():
                await websocket.send(translate_to_binary("class_error", {"gameId": gameId, "message": "This class of character is already taken"}))
            else:
                playerId = f'{playerType}-{gameId}'
                print(playerId)
                clients[playerId] = websocket
                games[gameId]['websockets'][websocket] = playerType
                games[gameId]['players'][playerType] = [20] #HP
                
                print(games)
                print(clients)

                print("Ile graczy w jednej grze "+str(len(games[gameId]['websockets'].keys())))
            
                await websocket.send(translate_to_binary("game_info", {'gameId': gameId, 'playerId': playerId, 'playerType': playerType, 'HP': 20}))

                if len(games[gameId]['websockets'].keys()) == 2:
                     for ws in games[gameId]['websockets'].keys():
                                await ws.send(translate_to_binary('start_game', {'message': 'You can start game' }))

                        
        elif data['type'] == 'reconnect':
            playerId = data['playerId']
            playerType, gameId = playerId.split('-')
            if playerId in clients:
                clients[playerId] = websocket
                HP = games[gameId]['players'][playerType][0]
                for ws, pType in games[gameId]['websockets'].items():
                    if pType == playerType:
                        del games[gameId]['websockets'][ws]
                        break
                games[gameId]['websockets'][websocket] = playerType 

                await websocket.send(translate_to_binary('reconnect', {'gameId':gameId, 'playerId': playerId, 'playerType': playerType, 'd_hp': games[gameId]['players']['d'][0], 'n_hp': games[gameId]['players']['n'][0]}))        

        elif data['type'] == 'action':
            playerId = data['playerId']
            playerType, gameId = playerId.split('-')
            action = data['action']
            turn = games[gameId]['turn']

            if turn == playerType:
                if playerType == 'd':
                    match action:
                        case 1:
                            games[gameId]['players']['n'][0] -= 5
                            if games[gameId]['players']['n'][0] <= 0:
                                for ws in games[gameId]['websockets'].keys():
                                    await ws.send(translate_to_binary('game_over', {"beaten": 'n'}))

                            else:
                                for ws in games[gameId]['websockets'].keys():
                                    await ws.send(translate_to_binary('player_update', {"playerType": 'n', 'HP': games[gameId]['players']['n'][0]}))

                        case 2:
                            print('2')
                        case _:
                            print('not one or two')
                    games[gameId]['turn'] = 'n'
                else:
                    match action:
                        case 1:
                            games[gameId]['players']['d'][0] -= 5
                            if games[gameId]['players']['d'][0] <= 0:
                                for ws in games[gameId]['websockets'].keys():
                                    await ws.send(translate_to_binary('game_over', {"beaten": 'd'}))

                            else:
                                for ws in games[gameId]['websockets'].keys():
                                    await ws.send(translate_to_binary('player_update', {"playerType": 'd', 'HP': games[gameId]['players']['d'][0]}))

                        case 2:
                            print('2')
                        case _:
                            print('not one or two')
                    games[gameId]['turn'] = 'd'

            else:
                print("Turn error")
                await websocket.send(translate_to_binary('turn_error', {'message': "It's not your turn"}))







def translate_to_binary(type, info):
    buffer = bytearray()
    if type == 'class_error':
        gameId = info['gameId'].encode()
        msg =  info['message'].encode()
        buffer.append(1)
        buffer.append(len(gameId))
        buffer.extend(gameId)
        buffer.extend(msg)
        return bytes(buffer)
    
    if type == 'game_info':
        buffer.append(2)
        gameId = info['gameId'].encode()
        playerId = info['playerId'].encode()

        buffer.append(len(gameId))
        buffer.extend(gameId)

        buffer.append(len(playerId))
        buffer.extend(playerId)

        buffer.append(ord(info['playerType']))
        buffer.append(info['HP'])
        print('game_info')
        print(buffer)
        return bytes(buffer)           

    if type == 'player_update':
        buffer.append(3)
        buffer.append(ord(info['playerType']))
        buffer.append(info['HP'])
        return bytes(buffer)
    
    if type ==  'game_over':
        buffer.append(4)
        buffer.append(ord(info['beaten']))
        return bytes(buffer)
    
    if type == 'start_game':
        msg =  info['message'].encode()
        buffer.append(5)
        buffer.extend(msg)
        return bytes(buffer)
    
    if type == 'reconnect':
        buffer.append(6)
        gameId = info['gameId'].encode()
        playerId = info['playerId'].encode()

        buffer.append(len(gameId))
        buffer.extend(gameId)

        buffer.append(len(playerId))
        buffer.extend(playerId)

        buffer.append(ord(info['playerType']))
        buffer.append(info['d_hp'])
        buffer.append(info['n_hp'])
        return bytes(buffer)
    
    if type == 'turn_error':
        msg =  info['message'].encode()
        buffer.append(7)
        buffer.extend(msg)
        return bytes(buffer)

def translate_to_text(bin_msg):
    type = bin_msg[0]
    print(bin_msg)
    print(type)
    if type == 1:
        playerType = chr(bin_msg[1])
        gameIdLen = bin_msg[2]
        
        if gameIdLen == 0 :
            return {'type': 'join', 'gameId': None, 'playerType': playerType}
        
        gameId = bin_msg[3:].decode('utf-8')
        return {'type': 'join', 'gameId' : gameId, 'playerType': playerType}

    if type == 2:
        playerId = bin_msg[1:].decode('utf-8')
        return {'type':'reconnect', 'playerId': playerId}

    if type == 3:
        action = bin_msg[1]
        playerId = bin_msg[2:].decode('utf-8')
        return {'type':'action', 'playerId': playerId, 'action': action}



    
async def main():
    async with websockets.serve(handle_message, "localhost", 5555):
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())

