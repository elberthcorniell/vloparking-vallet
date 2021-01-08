import * as React from 'react';
import {
    Text,
    View,
    Dimensions,
    TouchableOpacity,
    Image,
    StatusBar,
    ScrollView,
    Animated,
    Alert,
    RefreshControl
} from 'react-native';
import { styles } from '../style/styles'
import { AntDesign } from '@expo/vector-icons'
import * as  SecureStore from "expo-secure-store";
import Constants from 'expo-constants';
import { API_HOST } from '../config'
import SettingButton from '../components/settingButton'
import QRScreen from './QRScreen'
import EndTrip from './EndTrip'
import Maps from './Maps'
import io from 'socket.io-client'
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager'
import * as Permissions from 'expo-permissions'
import * as Notifications from 'expo-notifications'
import { call } from 'react-native-reanimated';
const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;
let socket
let headers
export default class Home extends React.Component {
    state = {
        valetTrips: [],
        scrollPosition: { x: 0, y: 0 },
        scrollY: new Animated.Value(0),
        modalState: false,
        location: {
            longitude: -19,
            latitude: 70
        },
        tripIds: [],
        availableParks: [1, 2, 3, 4, 5, 6],
        isAsked: false,
        events: []
    }
    componentDidMount() {
        SecureStore.getItemAsync('authtoken').then(token => {
            headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'authorization': token
            }
        })
        this.verifyAuth(() => {
            this.getValetTrips()
            SecureStore.getItemAsync('pushToken').then(token => {
                if (!token || token == '') {
                    this.registerForPushNotificationsAsync().then(pushToken => {
                        SecureStore.setItemAsync('pushToken', pushToken)
                        fetch(`${API_HOST}/api/admin/pushToken`, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({
                                pushToken,
                                valetId: this.state.valetId
                            })
                        })
                    })
                }
            })
        })
        this.mountSocket()
    }
    mountSocket() {
        socket = io(`${API_HOST}/`)
        socket.on('tripStarted', data => {
            let { status, tripId } = data
            if (status) {
                this.setState({
                    modalState: false,
                    locationModal: true,
                    tripId,
                    dateEnd: null
                }, () => {
                    this.getValetTrips()
                    this.startReporting()
                    this.getIsAsked()
                    this.getEvents()
                    this.getParkingAvailable()
                })
            }
        })
        socket.on('update', () => {
            this.getParkingAvailable()
            this.getEvents()
            this.getIsAsked()
            this.getValetTrips()
        })
        socket.on('carWithOwner', () => {
            this.setState({
                endModal: true
            })
        })
    }
    update() {
        this.getParkingAvailable()
        this.getEvents()
        this.getIsAsked()
        this.getValetTrips()
    }
    startReporting() {
        Location.startLocationUpdatesAsync('valetTrip', {
            accuracy: Location.Accuracy.Low,
            timeInterval: 1000,
            distanceInterval: 2
        }).then(() => {
            TaskManager.defineTask('valetTrip', ({ data: { locations }, e }) => {
                if (e) {
                    console.log(e)
                    return;
                }
                let { latitude, longitude, speed } = locations[0].coords
                socket.emit('valetLocation', {
                    tripIds: this.state.tripIds,
                    latitude,
                    longitude,
                    valetId: this.state.valetId,
                    speed
                })
                this.setState({
                    location: locations[0].coords
                })
            })
        })
    }
    getParkingAvailable() {
        SecureStore.getItemAsync('authtoken').then((token) => {
            fetch(`${API_HOST}/api/admin/parking/${this.state.businessId}`, { headers })
                .then(res => res.json())
                .then(data => {
                    let { success, availableParks } = data
                    if (success) {
                        this.setState({
                            availableParks
                        })
                    }
                })
        })
    }
    getValetTrips() {
        SecureStore.getItemAsync('authtoken').then((token) => {
            fetch(`${API_HOST}/api/admin/trips/valet/${this.state.valetId}`, { headers })
                .then(res => res.json())
                .then(data => {
                    let { success, valetTrips } = data
                    if (success) {
                        let tripIds = Array.from(valetTrips, x => x.dateEnd ? undefined : x.tripId)
                        this.setState({
                            valetTrips,
                            tripIds
                        })
                        for (let i = 0; i < tripIds.length; i++) {
                            if (tripIds[i]) {
                                this.startReporting()
                                break
                            }
                        }
                    }
                })
        })
    }
    createTrip(tripObject) {
        tripObject = JSON.parse(tripObject)
        tripObject = {
            ...tripObject,
            valetId: this.state.valetId,
            businessId: this.state.businessId
        }
        this.setState({
            tripId: tripObject.tripId
        })
        socket.emit('createTrip', tripObject, console.log)
    }
    updateState(index) {
        var card = this.state.card
        card[index].status = !card[index].status
        this.setState({ card })
    }
    askForLocationPermissions = async () => {
        let permission = await Location.requestPermissionsAsync()
        return (permission == 'granted')
    }
    verifyAuth(callback) {
        SecureStore.getItemAsync('authtoken').then((token) => {
            fetch(`${API_HOST}/api/validate/`, { headers })
                .then(res => res.json())
                .then(data => {
                    this.setState(data, () => {
                        if (callback)
                            callback()
                    })
                    if (!data.success) {
                        this.props.navigation.replace('Login')
                    }
                })
        })
    }
    setAsParked(parkId) {
        Alert.alert(
            'Hey!',
            'Do you want to set this car as parked here?',
            [
                {
                    text: 'Cancel',
                    onPress: () => {
                    },
                    style: 'cancel',
                },
                {
                    text: 'Yes', onPress: () => {
                        let { tripId, valetId } = this.state
                        socket.emit("setAsParked", {
                            parkId,
                            tripId,
                            valetId
                        }, data => {
                            let { success, msg } = data
                            if (data == "OK")
                                this.getParkingAvailable()
                            Alert.alert('Hey!', msg || data, [
                                {
                                    text: 'Ok',
                                    onPress: () => {
                                    },
                                    style: 'cancel',
                                },
                            ])
                        })
                    }
                },
            ]
        )
    }
    getEvents() {
        SecureStore.getItemAsync('authtoken').then(token => {
            fetch(`${API_HOST}/api/admin/events/${this.state.tripId}`, { headers })
                .then(res => res.json())
                .then(data => {
                    let { success, events } = data
                    this.setState({
                        events: events || []
                    })
                })
        })
    }
    registerForPushNotificationsAsync = async () => {
        let token;
        if (Constants.isDevice) {
            const { status: existingStatus } = await Permissions.getAsync(Permissions.NOTIFICATIONS);
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                alert('Failed to get push token for push notification!');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync()).data;
        } else {
            alert('Must use physical device for Push Notifications');
        }

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        return token;
    }
    getIsAsked() {
        socket.emit('isAsked', { tripId: this.state.tripId }, isAsked => {
            console.log(isAsked)
            this.setState({
                isAsked
            })
        })
    }
    carWithOwner() {
        socket.emit('carWithOwner', {
            tripId: this.state.tripId
        }, data => {
            if (data == "OK") {
                this.getValetTrips();
                this.setState({
                    locationModal: false
                })
            } else {
                Alert.alert('Error!', 'User needs to aks for the car first', [
                    {
                        text: 'Ok',
                        onPress: () => {
                        },
                        style: 'cancel',
                    },
                ])
            }
        })
    }
    endTrip() {
        socket.emit('confirmCarWithOwner', {
            tripId: this.state.tripId
        }, data => {
            if (data == "OK") {
                this.getValetTrips();
                this.setState({
                    locationModal: false
                })
            } else {
                Alert.alert('Error!', 'User needs to aks for the car first', [
                    {
                        text: 'Ok',
                        onPress: () => {
                        },
                        style: 'cancel',
                    },
                ])
            }
        })
    }
    render() {
        return (
            <View style={{ ...styles.container, minHeight: screenHeight, height: undefined }}>
                <StatusBar barStyle="dark-content" backgroundColor={this.state.scrollPosition.y > 90 ? '#ff4040' : "white"} />
                <ScrollView onScroll={data => {
                    this.setState({
                        scrollPosition: data.nativeEvent.contentOffset
                    })
                }}
                    stickyHeaderIndices={[0]}
                >
                    <RefreshControl
                        refreshing={this.state.refreshing}
                        onRefresh={() => { this.componentDidMount() }}
                    >
                        <View>
                            <View
                                style={{
                                    width: screenWidth,
                                    alignItems: 'center',
                                    marginTop: -this.state.scrollPosition.y < -95 ? -95 : -this.state.scrollPosition.y,
                                    opacity: 1 - this.state.scrollPosition.y / 95
                                }}
                            >
                                <Text style={styles.blueTitle}>History</Text>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f5f7',
                                        width: 40,
                                        height: 40,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 20,
                                        position: 'absolute',
                                        right: 120,
                                        top: 30
                                    }}
                                    onPress={() => { this.props.navigation.navigate('Account') }}>
                                    <AntDesign name={'bells'} size={14} color='back' size={20} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f5f7',
                                        width: 40,
                                        height: 40,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 20,
                                        position: 'absolute',
                                        right: 70,
                                        top: 30
                                    }}
                                    onPress={() => { this.setState({ modalState: true }) }}>
                                    <AntDesign name={'qrcode'} size={14} color='back' size={20} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#f3f5f7',
                                        width: 40,
                                        height: 40,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 20,
                                        position: 'absolute',
                                        right: 20,
                                        top: 30
                                    }}
                                    onPress={() => { this.props.navigation.navigate('Account') }}>
                                    <AntDesign name={'user'} size={14} color='back' size={20} />
                                </TouchableOpacity>
                            </View>
                            <View
                                style={{
                                    width: screenWidth,
                                    borderRadius: 5,
                                    alignItems: 'center',
                                }}
                            >
                                <View
                                    style={{
                                        width: screenWidth - (((this.state.scrollPosition.y / 80) > 1 ? 0 : 1 - (this.state.scrollPosition.y / 80)) * 20),
                                        height: 130 + (((this.state.scrollPosition.y / 80) > 1 ? 1 : (this.state.scrollPosition.y / 80)) * 10),
                                        backgroundColor: '#ff4040',
                                        marginBottom: -80,
                                        borderTopLeftRadius: 5,
                                        borderTopRightRadius: 5
                                    }}
                                >
                                </View>
                                <View
                                    style={{
                                        width: screenWidth - 40,
                                        height: 120,
                                        elevation: 10,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 5, height: 5 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 5,
                                        backgroundColor: 'white',
                                        borderRadius: 5,
                                        padding: 10,

                                    }}
                                >
                                    <TouchableOpacity
                                        onPress={() => { this.update(); }}
                                        style={{
                                            margin: 10,
                                            position: 'absolute',
                                            top: 10,
                                            right: 20,
                                            zIndex: 2
                                        }}
                                    >
                                        <Text><AntDesign name='reload1' size={20} color='#a1a1a1' /></Text>
                                    </TouchableOpacity>
                                    <Text style={{ margin: 10, fontWeight: 'bold', width: '100%' }}>Your Trips</Text>
                                    <Text style={{
                                        fontSize: 36,
                                        textAlign: 'right',
                                        marginRight: 20,
                                        marginBottom: 10,
                                        fontWeight: '400'
                                    }}>{this.state.valetTrips.length} trips</Text>
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            flexWrap: 'wrap',
                                            width: screenWidth,
                                            display: 'none'
                                        }}
                                    >
                                        <View
                                            style={{
                                                ...styles.buttonBlueLight,
                                                width: (screenWidth - 80) / 3,
                                                height: 40,
                                                marginRight: 10
                                            }}
                                        ><Text style={styles.buttonBlueText}>Send</Text></View>
                                        <View
                                            style={{
                                                ...styles.buttonBlueLight,
                                                width: (screenWidth - 80) / 3,
                                                height: 40,
                                                marginRight: 10
                                            }}
                                        ><Text style={styles.buttonBlueText}>Receive</Text></View>
                                        <View
                                            style={{
                                                ...styles.buttonBlue,
                                                width: (screenWidth - 80) / 3,
                                                height: 40,
                                            }}
                                        ><Text style={styles.buttonBlueText}>Swap</Text></View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </RefreshControl>
                    <View style={{ marginTop: 20, width: screenWidth, minHeight: screenHeight, alignItems: 'center' }}>
                        {this.state.valetTrips.map(info => {
                            return <SettingButton
                                text={info.username}
                                description={info.dateStart}
                                onPress={() => {
                                    this.setState({
                                        tripId: info.tripId,
                                        locationModal: true,
                                        dateEnd: info.dateEnd
                                    }, () => {
                                        this.getParkingAvailable()
                                        this.getEvents()
                                        socket.emit('joinTrip', {
                                            tripId: this.state.tripId
                                        }, data => {
                                            let { valetLocation, carLocation, keyLocation, userLocation } = data
                                            data != 'FAIL' && this.setState({
                                                valetLocation: valetLocation || {},
                                                carLocation: carLocation || {},
                                                keyLocation: keyLocation || {},
                                                userLocation: userLocation || {}
                                            }, () => {
                                                this.getIsAsked()
                                            })
                                        })
                                    })
                                }}
                                icon={
                                    info.dateEnd ?
                                        <View style={{
                                            backgroundColor: 'lightgreen',
                                            height: 40, width: 40,
                                            justifyContent: "center",
                                            alignItems: 'center',
                                            borderRadius: 20,
                                        }}><Text style={{
                                            color: 'white',
                                            fontWeight: "bold"
                                        }}>Done</Text></View> :
                                        <View style={{
                                            backgroundColor: '#FF4040',
                                            height: 40, width: 40,
                                            justifyContent: "center",
                                            alignItems: 'center',
                                            borderRadius: 20,
                                        }}><Text style={{
                                            color: 'white',
                                            fontWeight: "bold"
                                        }}>Live</Text></View>
                                }
                            />
                        })}
                    </View>

                </ScrollView>
                <EndTrip
                    modalState={this.state.endModal}
                    closeModal={() => { this.setState({ endModal: false }) }}
                    userId={this.state.userId}
                    tripId={this.state.tripId}
                    endTrip={() => this.endTrip()}
                />
                <QRScreen
                    askForLocationPermissions={e => this.askForLocationPermissions(e)}
                    createTrip={e => this.createTrip(e)}
                    modalState={this.state.modalState}
                    closeModal={() => { this.setState({ modalState: false }) }}
                />
                {this.state.locationModal && <Maps
                    createTrip={e => this.createTrip(e)}
                    modalState={this.state.locationModal}
                    closeModal={() => { this.setState({ locationModal: false }) }}
                    availableParks={this.state.availableParks}
                    setAsParked={e => this.setAsParked(e)}
                    location={this.state.location}
                    isAsked={this.state.isAsked}
                    carWithOwner={() => this.carWithOwner()}
                    dateEnd={this.state.dateEnd}
                    events={this.state.events}
                />}
            </View>
        );
    }
}

