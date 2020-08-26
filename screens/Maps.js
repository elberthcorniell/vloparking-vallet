import * as React from 'react';
import { Text, View, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Modal } from 'react-native';
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
                                    {this.props.availableParks.length == 0 ?
                                        <Text>No parking lots available</Text>
                                        :
                                        this.props.dateEnd == null && this.props.availableParks.map(park => {
                                            return <TouchableOpacity
                                                onPress={() => this.props.setAsParked(park.parkId)}
                                            >
                                                <View style={{
                                                    height: screenHeight * 0.25,
                                                    width: screenWidth * 0.28,
                                                    margin: screenWidth * 0.025,
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
                                </View>}
                                <View style={{ padding: 10, width: screenWidth }}>
                                    <Text style={styles.blueTitle}>Trip Info</Text>
                                    {this.props.events.map(info =>
                                        <SettingButton style={{
                                            backgroundColor: info.type == 0 ? 'yellow' : info.type == null ? 'red' : '#f3f5f7'
                                        }}
                                            text={info.description}
                                            description={info.date}
                                            onPress={() => { }}
                                        />)}
                                </View>
                            </ScrollView>
                        </View>
                            {this.props.isAsked && this.props.dateEnd == null && <TouchableOpacity
                                onPress={() => {
                                    this.props.carWithOwner()
                                }}
                            >
                                <View style={{ ...styles.buttonBlue, margin: 20, marginTop: -20, zIndex: 2000  }}>
                                    <Text style={styles.buttonBlueText}>Vehiculo entregado</Text>
                                </View>
                            </TouchableOpacity>}
                    </View>
                </View>
            </Modal>
        );
    }
}
