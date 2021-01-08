import * as React from 'react';
import { Text, View, Image, Dimensions, TouchableOpacity, StatusBar, Modal } from 'react-native';
import { styles } from '../style/styles'
import { AntDesign } from '@expo/vector-icons'
import * as Permissions from 'expo-permissions'
import * as  SecureStore from "expo-secure-store";
import MapView from 'react-native-maps';
import { API_HOST } from '../config';
import { ScrollView } from 'react-native-gesture-handler';
import SettingButton from '../components/settingButton';

const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;

export default class Maps extends React.Component {
    state = {}

    componentDidMount() {
        this.getPermision()
    }
    async getPermision() {
        let { status } = await Permissions.askAsync(Permissions.LOCATION);
        if (status !== 'granted') {
            this.setState({
                locationResult: 'Permission to access location was denied',
            });
        } else {
            this.setState({ hasLocationPermissions: true });
        }
    }
    render() {
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={this.props.modalState || false}
                onRequestClose={() => {
                    this.props.closeModal(); /*this.setInitialState()*/
                }}
            >
                <StatusBar barStyle="dark-content" backgroundColor="rgba(0,0,0,0.4)" />
                <View style={{
                    ...styles.container,
                    backgroundColor: 'rgba(0,0,0,0.4)'
                }}>
                    <View style={{ ...styles.modalView, overflow: 'hidden' }}>
                        <TouchableOpacity
                            onPress={() => { this.props.closeModal(); /*this.setInitialState();*/ }}
                            style={{
                                margin: 10,
                                position: 'absolute',
                                top: 10,
                                right: 20,
                                zIndex: 2
                            }}
                        >
                            <Text><AntDesign name='close' size={20} color='#a1a1a1' /></Text>
                        </TouchableOpacity>

                        <View style={{
                            width: screenWidth,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            whiteSpace: 'wrap',
                            marginTop: 10,
                            paddingBottom: 20
                        }}>
                            <ScrollView decelerationRate={'fast'} horizontal={true} pagingEnabled={true}>
                                {(this.props.dateEnd == null) &&
                                    <View style={{ ...styles.qrContainer, borderRadius: 5, alignItems: 'center', height: screenHeight * 0.7, width: screenWidth }}>
                                        <Text style={styles.blueTitle}>Live Trip</Text>
                                        {this.props.modalState && <MapView
                                            showsUserLocation
                                            loadingEnabled
                                            initialRegion={{
                                                latitude: this.props.location.latitude || -19,
                                                longitude: this.props.location.longitude || 70,
                                                latitudeDelta: 0.0015,
                                                longitudeDelta: 0.0015
                                            }}
                                            region={this.state.region || {
                                                latitude: this.props.location.latitude || -19,
                                                longitude: this.props.location.longitude || 70,
                                                latitudeDelta: 0.0015,
                                                longitudeDelta: 0.0015
                                            }}
                                            onRegionChange={() => {
                                                this.setState({
                                                    region: {
                                                        latitude: this.props.location.latitude || -19,
                                                        longitude: this.props.location.longitude || 70,
                                                        latitudeDelta: 0.0015,
                                                        longitudeDelta: 0.0015
                                                    }
                                                })
                                            }}
                                            style={styles.mapContainer} />}
                                    </View>}

                                {(this.props.dateEnd == null) && <View style={{
                                    width: screenWidth
                                }}>
                                    <Text style={styles.blueTitle}>Free Parking</Text>
                                    <View style={{
                                        width: screenWidth,
                                        flexDirection: 'row'
                                    }}>
                                        {this.props.availableParks.length == 0 ?
                                            <View style={{
                                                height: screenHeight,
                                                width: screenWidth,
                                                alignItems: 'center'
                                            }}>
                                                <Image style={{ width: screenWidth * 0.6, height: screenWidth * 0.6, marginTop: 30 }} source={require('../assets/notfound.png')} />
                                                <Text>We didn't find free parking lots</Text>
                                            </View>
                                            :
                                            this.props.dateEnd == null && this.props.availableParks.map(park => {
                                                return <TouchableOpacity
                                                    style={{
                                                        width: screenWidth * 0.28,
                                                        margin: screenWidth * 0.025,
                                                    }}
                                                    onPress={() => this.props.setAsParked(park.parkId)}
                                                >
                                                    <View style={{
                                                        height: screenHeight * 0.25,
                                                        borderRadius: 5,
                                                        backgroundColor: '#f3f5f7',
                                                        elevation: 10,
                                                        justifyContent: 'center',
                                                        alignItems: 'center'
                                                    }}>
                                                        <Text style={{ fontSize: 28 }}>{park.parkNum}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            })}
                                    </View>
                                </View>}
                                <View style={{ padding: 10, width: screenWidth }}>
                                    <Text style={styles.blueTitle}>Trip Info</Text>
                                    <ScrollView>
                                    {this.props.events.map(info =>
                                        <SettingButton style={{
                                            backgroundColor: info.type == 0 ? 'orange' : info.type == null ? 'red' : '#f3f5f7'
                                        }}
                                            text={info.description}
                                            description={info.date}
                                            descriptionStyle={{
                                                color: info.type == 1 ? '#a1a1a1' : 'white'
                                            }}
                                        />)}
                                        </ScrollView>
                                </View>
                            </ScrollView>
                        {this.props.isAsked && (this.props.dateEnd == null) &&
                            <TouchableOpacity
                                style={{
                                    position: 'absolute',
                                    bottom: screenHeight * 0.05,
                                    margin: 20
                                }}
                                onPress={() => {
                                    this.props.carWithOwner()
                                }}>
                                <View style={{ ...styles.buttonBlue,  }}>
                                    <Text style={styles.buttonBlueText}>Trip Done</Text>
                                </View>
                            </TouchableOpacity>}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}
